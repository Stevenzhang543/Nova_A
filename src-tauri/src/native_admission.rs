//! Native export admission only. JS global staging/byte-budget integration is a separate slice.
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock};

const BUSY: &str = "Native export is busy; another export is still running. Wait for it to finish before retrying.";
static EXPORT_ADMISSION: OnceLock<Arc<Admission>> = OnceLock::new();

#[derive(Default)]
struct Admission {
    active: AtomicBool,
}

impl Admission {
    fn try_acquire(self: &Arc<Self>) -> Option<Permit> {
        self.active
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .ok()
            .map(|_| Permit {
                admission: Arc::clone(self),
            })
    }
}

// The permit is neither Clone nor externally releasable. The actual blocking closure owns it.
struct Permit {
    admission: Arc<Admission>,
}

impl Drop for Permit {
    fn drop(&mut self) {
        self.admission.active.store(false, Ordering::Release);
    }
}

pub(crate) async fn run_export<T, F>(work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    let admission = EXPORT_ADMISSION.get_or_init(|| Arc::new(Admission::default()));
    run_admitted(Arc::clone(admission), work).await
}

async fn run_admitted<T, F>(admission: Arc<Admission>, work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    // Reject before spawning: no native waiting queue and no thread waiting for admission.
    let permit = admission.try_acquire().ok_or_else(|| BUSY.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        let _permit = permit;
        work()
    })
    .await
    .map_err(|error| format!("Native export worker failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::future::Future;
    use std::sync::mpsc;
    use std::task::{Context, Poll, Waker};
    use std::thread;
    use std::time::{Duration, Instant};

    const LIMIT: Duration = Duration::from_secs(5);

    fn wait_released(admission: &Admission) {
        let until = Instant::now() + LIMIT;
        while admission.active.load(Ordering::Acquire) {
            assert!(
                Instant::now() < until,
                "actual blocking worker did not release its permit"
            );
            // A bounded test wait, never a production admission loop.
            thread::sleep(Duration::from_millis(1));
        }
    }

    #[test]
    fn native_export_dispatch_runs_on_a_real_blocking_thread() {
        let caller = thread::current().id();
        let admission = Arc::new(Admission::default());
        let worker = tauri::async_runtime::block_on(run_admitted(Arc::clone(&admission), || {
            Ok(thread::current().id())
        }))
        .unwrap();
        assert_ne!(caller, worker);
        assert!(!admission.active.load(Ordering::Acquire));
    }

    #[test]
    fn native_export_busy_rejects_before_another_closure_is_spawned() {
        let admission = Arc::new(Admission::default());
        let (started_tx, started_rx) = mpsc::channel();
        let (release_tx, release_rx) = mpsc::channel();
        let first = tauri::async_runtime::spawn(run_admitted(Arc::clone(&admission), move || {
            started_tx.send(()).unwrap();
            release_rx
                .recv_timeout(LIMIT)
                .map_err(|error| error.to_string())?;
            Ok(7)
        }));
        started_rx.recv_timeout(LIMIT).unwrap();
        let attempted = Arc::new(AtomicBool::new(false));
        let second_attempted = Arc::clone(&attempted);
        let busy =
            tauri::async_runtime::block_on(run_admitted(Arc::clone(&admission), move || {
                second_attempted.store(true, Ordering::Release);
                Ok(8)
            }));
        assert_eq!(busy.unwrap_err(), BUSY);
        assert!(!attempted.load(Ordering::Acquire));
        assert!(admission.active.load(Ordering::Acquire));
        release_tx.send(()).unwrap();
        assert_eq!(tauri::async_runtime::block_on(first).unwrap().unwrap(), 7);
        assert!(!admission.active.load(Ordering::Acquire));
    }

    #[test]
    fn native_export_cancelling_the_async_owner_keeps_actual_work_admitted_until_exit() {
        let admission = Arc::new(Admission::default());
        let (started_tx, started_rx) = mpsc::channel();
        let (release_tx, release_rx) = mpsc::channel();
        let (ended_tx, ended_rx) = mpsc::channel();
        let owner = tauri::async_runtime::spawn(run_admitted(Arc::clone(&admission), move || {
            started_tx.send(()).unwrap();
            let result = release_rx
                .recv_timeout(LIMIT)
                .map_err(|error| error.to_string());
            ended_tx.send(()).unwrap();
            result
        }));
        started_rx.recv_timeout(LIMIT).unwrap();
        owner.abort();
        assert!(tauri::async_runtime::block_on(owner).is_err());
        assert!(admission.active.load(Ordering::Acquire));
        assert!(ended_rx.try_recv().is_err());
        assert_eq!(
            tauri::async_runtime::block_on(run_admitted(Arc::clone(&admission), || { Ok(()) }))
                .unwrap_err(),
            BUSY
        );
        release_tx.send(()).unwrap();
        ended_rx.recv_timeout(LIMIT).unwrap();
        wait_released(&admission);
        assert_eq!(
            tauri::async_runtime::block_on(run_admitted(admission, || Ok(11))).unwrap(),
            11
        );
    }

    #[test]
    fn native_export_dropping_the_command_future_does_not_release_running_work() {
        let admission = Arc::new(Admission::default());
        let (started_tx, started_rx) = mpsc::channel();
        let (release_tx, release_rx) = mpsc::channel();
        let (ended_tx, ended_rx) = mpsc::channel();
        let mut command = Box::pin(run_admitted(Arc::clone(&admission), move || {
            started_tx.send(()).unwrap();
            let result = release_rx
                .recv_timeout(LIMIT)
                .map_err(|error| error.to_string());
            ended_tx.send(()).unwrap();
            result
        }));
        let mut context = Context::from_waker(Waker::noop());
        assert!(matches!(command.as_mut().poll(&mut context), Poll::Pending));
        started_rx.recv_timeout(LIMIT).unwrap();
        // The start receipt proves this particular drop happens after work is running.
        drop(command);
        assert!(admission.active.load(Ordering::Acquire));
        assert!(admission.try_acquire().is_none());
        release_tx.send(()).unwrap();
        ended_rx.recv_timeout(LIMIT).unwrap();
        wait_released(&admission);
    }

    #[test]
    fn native_export_error_preserves_original_error_and_releases_once() {
        let admission = Arc::new(Admission::default());
        let result = tauri::async_runtime::block_on(run_admitted(Arc::clone(&admission), || {
            Err::<(), _>("original export error".to_string())
        }));
        assert_eq!(result.unwrap_err(), "original export error");
        let replacement = admission.try_acquire().unwrap();
        assert!(admission.try_acquire().is_none());
        drop(replacement);
        assert!(!admission.active.load(Ordering::Acquire));
    }

    #[test]
    fn native_export_real_blocking_panic_releases_permit_and_returns_join_failure() {
        let admission = Arc::new(Admission::default());
        let result = tauri::async_runtime::block_on(run_admitted(Arc::clone(&admission), || {
            panic!("controlled native export worker failure");
            #[allow(unreachable_code)]
            Ok(())
        }));
        assert!(result
            .unwrap_err()
            .starts_with("Native export worker failed:"));
        assert!(!admission.active.load(Ordering::Acquire));
        assert_eq!(
            tauri::async_runtime::block_on(run_admitted(admission, || Ok(13))).unwrap(),
            13
        );
    }
}
