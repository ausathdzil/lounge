# Phase 1: Foundation

**Goal:** Set up the main window with navigation, placeholder views, basic settings, and about dialog.

**Prerequisites:** Project scaffolded via GNOME Builder with app ID `io.github.ausathdzil.Lounge`

---

## Configuration

| Setting          | Value                           |
| ---------------- | ------------------------------- |
| App ID           | `io.github.ausathdzil.Lounge`   |
| Navigation       | `AdwNavigationSplitView`        |
| Views            | Search, Diary, Watchlist, Collections |

---

## Tasks

### 1. Update GSettings Schema

**File:** `data/io.github.ausathdzil.Lounge.gschema.xml`

Add keys for window state persistence:

```xml
<key name="window-width" type="i">
  <default>1200</default>
  <summary>Window width</summary>
</key>
<key name="window-height" type="i">
  <default>800</default>
  <summary>Window height</summary>
</key>
<key name="window-maximized" type="b">
  <default>false</default>
  <summary>Window maximized state</summary>
</key>
```

---

### 2. Main Window with Navigation

**Files:** `src/window.js`, `data/ui/window.ui`

- Replace default window content with `AdwNavigationSplitView`
- Sidebar contains a `GtkListBox` with 4 navigation rows:
  - Search (icon: `system-search-symbolic`)
  - Diary (icon: `view-list-symbolic`)
  - Watchlist (icon: `view-pin-symbolic`)
  - Collections (icon: `view-grid-symbolic`)
- Content area shows the selected view
- Sidebar collapses on narrow windows (responsive)

**Structure:**
```
AdwApplicationWindow
└── AdwNavigationSplitView
    ├── sidebar: AdwNavigationPage
    │   └── AdwToolbarView
    │       ├── AdwHeaderBar (top)
    │       └── GtkListBox (content)
    └── content: AdwNavigationPage
        └── AdwToolbarView
            ├── AdwHeaderBar (top)
            └── GtkStack (content) ← holds the 4 views
```

---

### 3. Placeholder Views

Create 4 stub view files, each as a simple `GtkBox` with a centered `AdwStatusPage`:

| View | File | Title | Icon |
|------|------|-------|------|
| SearchView | `src/views/search-view.js` | "Search" | `system-search-symbolic` |
| DiaryView | `src/views/diary-view.js` | "Diary" | `view-list-symbolic` |
| WatchlistView | `src/views/watchlist-view.js` | "Watchlist" | `view-pin-symbolic` |
| CollectionsView | `src/views/collections-view.js` | "Collections" | `view-grid-symbolic` |

Each placeholder shows an `AdwStatusPage` with:
- Icon
- Title (e.g., "Search for Movies")
- Description (e.g., "Find and add movies from TMDB")

---

### 4. Window State Persistence

**File:** `src/window.js`

- On window creation: restore size and maximized state from GSettings
- On window close: save current size and maximized state to GSettings
- Use `close-request` signal to save before closing

```javascript
// Restore
this.set_default_size(settings.get_int('window-width'), settings.get_int('window-height'));
if (settings.get_boolean('window-maximized')) {
  this.maximize();
}

// Save (on close-request)
settings.set_int('window-width', this.get_width());
settings.set_int('window-height', this.get_height());
settings.set_boolean('window-maximized', this.is_maximized());
```

---

### 5. About Dialog

**File:** `src/window.js` or `src/application.js`

Add an "About" action that shows `AdwAboutDialog`:

```javascript
const about = new Adw.AboutDialog({
  application_name: 'Lounge',
  application_icon: 'io.github.ausathdzil.Lounge',
  version: '0.1.0',
  developer_name: 'Ausath Dzil',
  developers: ['Ausath Dzil'],
  copyright: '© 2025 Ausath Dzil',
  license_type: Gtk.License.GPL_3_0,
  issue_url: 'https://github.com/ausathdzil/lounge/issues',
});
about.present(this);
```

Add menu button in header bar with "About Lounge" option.

---

### 6. Update Meson Build Files

**File:** `src/meson.build`

Register new source files:

```meson
lounge_sources = [
  'main.js',
  'application.js',
  'window.js',
  'views/search-view.js',
  'views/diary-view.js',
  'views/watchlist-view.js',
  'views/collections-view.js',
]
```

**File:** `data/meson.build`

Ensure UI files are bundled in resources.

---

## File Structure After Phase 1

```
lounge/
├── data/
│   ├── ui/
│   │   └── window.ui
│   ├── io.github.ausathdzil.Lounge.gschema.xml
│   └── meson.build
├── src/
│   ├── views/
│   │   ├── search-view.js
│   │   ├── diary-view.js
│   │   ├── watchlist-view.js
│   │   └── collections-view.js
│   ├── main.js
│   ├── application.js
│   ├── window.js
│   └── meson.build
└── meson.build
```

---

## Acceptance Criteria

- [ ] App launches without errors
- [ ] Sidebar shows 4 navigation items with icons
- [ ] Clicking nav items switches the content view
- [ ] Each view shows a placeholder status page
- [ ] Window size/state persists across restarts
- [ ] About dialog shows app info
- [ ] Sidebar collapses on narrow window (< 600px)

---

## Notes

- Database setup deferred to Phase 2
- TMDB API integration deferred to Phase 2
- No functional features yet, just navigation shell
