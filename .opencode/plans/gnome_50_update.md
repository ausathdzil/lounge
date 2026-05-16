# Update Plan: GNOME 50 and Production Build

## 1. Update Flatpak SDK (GNOME 50)
- Modify `io.github.ausathdzil.lounge.json` to bump `"runtime-version"` from `"48"` to `"50"`.
- Update `README.md` requirement text to reflect the need for the GNOME 50+ runtime.

## 2. Add Production Build Instructions to README
- Add a "Local Production Build" section to `README.md`. 
- Provide explicit commands to generate a distributable Flatpak bundle using `flatpak build-bundle`.
- Provide instructions on how to install the exported `.flatpak` bundle system-wide or user-wide locally.

## 3. Codebase Deprecation Audit (GNOME 48 -> 50)
- Analyze the GJS source files in `src/` to identify and update any GTK4 or Libadwaita APIs that may have been deprecated or changed between GNOME 48 and 50.
- Check for common deprecations like `Gtk.Dialog`, `Gtk.FileChooserDialog`, or `Adw.MessageDialog` which are transitioning to `Adw.Dialog` or `Gtk.FileDialog`.
- Apply updates as needed.

## 4. Verification
- Since GNOME Builder will be used by the user for testing, push code updates directly and let the user verify the build and test results.