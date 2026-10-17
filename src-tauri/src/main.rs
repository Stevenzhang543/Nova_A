// 桌面程序入口：配置 Windows 子系统后进入 Nova_A Tauri 运行流程。
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 进入桌面宿主的统一启动函数。
fn main() {
    nova_a_lib::run()
}
