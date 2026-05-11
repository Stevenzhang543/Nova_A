// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use tauri::{Manager, Size, PhysicalSize};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 获取主窗口
            let window = app.get_webview_window("main").unwrap();

            // 获取主显示器
            let monitor = window.primary_monitor()?.unwrap();
            let screen_size = monitor.size();

            // 设置为屏幕 50%
            let width = screen_size.width / 3 * 2;
            let height = screen_size.height / 3 * 2;

            // 应用窗口大小
            window.set_size(Size::Physical(PhysicalSize {
                width,
                height,
            }))?;

            // 窗口居中
            window.center()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}