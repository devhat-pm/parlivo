/// Product name shown by the desktop shell.
pub fn app_name() -> &'static str {
    "Parlivo"
}

/// Opens one window on the bundled static export of apps/web (or the dev server in
/// `tauri dev`). Deep-link OAuth, tray, hotkeys and updater arrive in later prompts.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the Parlivo desktop app");
}

#[cfg(test)]
mod tests {
    use super::app_name;

    #[test]
    fn names_the_product() {
        assert_eq!(app_name(), "Parlivo");
    }
}
