// 把 Windows 应用清单传入 Tauri 构建器并生成平台构建资源。
// 桌面构建入口：调用 Tauri 构建辅助逻辑生成平台所需资源。
fn main() {
    let windows = tauri_build::WindowsAttributes::new()
        .app_manifest(include_str!("windows-app-manifest.xml"));
    let attributes = tauri_build::Attributes::new().windows_attributes(windows);
    tauri_build::try_build(attributes).expect("failed to build Nova_A desktop resources")
}
