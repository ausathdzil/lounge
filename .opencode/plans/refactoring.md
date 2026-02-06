# Lounge Refactoring Plan

## Audit Summary

Full codebase audit completed on Feb 6, 2026. No behavioral changes — structure and readability only.

---

## Step 1: Extract `removeAllChildren(container)` utility

**Problem:** Identical 5-line loop to clear a container's children appears in 5 places.

**Files affected:**
- New: `src/utils.js`
- `src/views/search-view.js:255-260`
- `src/views/log-view.js:212-217`
- `src/widgets/movie-card.js:132-137, 163-168`
- `src/widgets/movie-details-dialog.js:353-358`

**Risk:** Low

---

## Step 2: Extract shared poster loading helper

**Problem:** Nearly identical poster load+scale+display logic (~50 lines) duplicated in `movie-card.js` and `movie-details-dialog.js`.

**Files affected:**
- `src/utils.js` (add helper)
- `src/widgets/movie-card.js:152-210`
- `src/widgets/movie-details-dialog.js:342-391`

**Risk:** Low

---

## Step 3: Replace magic numbers with named imports

**Problem:** Raw integers used instead of enum imports (`wrap_mode: 2`, `ellipsize: 3`, `2` for BILINEAR interp).

**Locations:**
- `src/widgets/movie-card.js:109, 112, 186`
- `src/widgets/log-entry-card.js:101, 112`
- `src/widgets/movie-details-dialog.js:370`

**Imports needed:** `Pango`, `GdkPixbuf`

**Risk:** Low

---

## Step 4: Remove unused `Adw` import from `movie-card.js`

**Problem:** `import Adw from 'gi://Adw'` on line 24 is never referenced.

**Files affected:**
- `src/widgets/movie-card.js:24`

**Risk:** None

---

## Step 5: Extract `LOG_ENTRY_COLUMNS` constant in `database.js`

**Problem:** Identical 14-column SELECT list duplicated in `getMovieLogs()` and `getLogEntry()`.

**Files affected:**
- `src/services/database.js:308-326, 364-384`

**Risk:** Low

---

## Step 6: Break down `_buildContent()` in `movie-details-dialog.js`

**Problem:** 193-line method building poster, title, log button, details group, and overview.

**Extract into:**
- `_buildPosterSection()`
- `_buildTitleSection()`
- `_buildLogButton()`
- `_buildDetailsGroup()`
- `_buildOverviewGroup()`

**Files affected:**
- `src/widgets/movie-details-dialog.js:126-319`

**Risk:** Low

---

## Step 7: Break down `_buildUI()` in `log-entry-dialog.js`

**Problem:** 141-line method building error banner, movie context, rating group, date/notes group, and button bar.

**Extract into:**
- `_buildFormFields()` (rating, date, notes groups)
- `_buildButtonBar()` (delete/cancel/save buttons)

**Files affected:**
- `src/widgets/log-entry-dialog.js:64-205`

**Risk:** Low

---

## Step 8: Standardize error logging

**Problem:** Mixed use of `logError(error, msg)` (GJS) and `console.error(msg, error)` (JS standard).

**Decision:** Use `console.error()` everywhere — it's the modern standard and works in GJS.

**Files affected:**
- `src/views/search-view.js`
- `src/widgets/movie-card.js`
- `src/widgets/movie-details-dialog.js`
- `src/services/image-cache.js`
- `src/services/database.js`

**Risk:** Low

---

## Step 9: Clean up callback vs signal inconsistency

**Problem:**
- `SearchView` declares a `'movie-selected'` signal but uses `movieSelectedCallback` instead.
- `LogView` uses `logEntrySelectedCallback` and `navigateToSearchCallback` — plain callbacks, no signals.
- Should pick one pattern: either callbacks (simpler) or signals (idiomatic GObject).

**Decision:** Remove the unused `'movie-selected'` signal declaration and the `this.emit('movie-selected')` call from SearchView, since we use callbacks. Keep callbacks — they're simpler and sufficient here.

**Files affected:**
- `src/views/search-view.js`

**Risk:** Medium (need to verify signal removal doesn't break anything)

---

## Step 10: Extract named constants

**Problem:** Unnamed magic values scattered across files.

**Constants to extract:**
- `SEARCH_DEBOUNCE_MS = 500` (search-view.js:58)
- `ERROR_BANNER_TIMEOUT_MS = 5000` (log-entry-dialog.js:306)
- `POSTER_HEIGHT = 300` (used in 4 places)
- `POSTER_SIZE = 'w342'` (used in 3 places)
- `MAX_CARDS_PER_LINE = 6` (used in 2 places)
- `MIN_CARDS_PER_LINE = 2` (used in 2 places)

**Files affected:** Several widget and view files.

**Risk:** Low

---

## Execution Notes

- One commit per step, conventional commit format: `refactor(scope): description`
- User tests in GNOME Builder after each step before committing
- Steps can be reordered or skipped if needed
- New files must be added to `src/io.github.ausathdzil.lounge.src.gresource.xml`
