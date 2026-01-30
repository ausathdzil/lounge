# Phase 4: Movie Logging - Implementation Plan

## Overview
Implement the core movie logging feature that allows users to track watched movies with ratings, dates, and notes.

## Decisions Made

### Rating System
- Scale: 1-5 stars (whole stars only, no half-stars)
- Display: Gold filled stars for selected, gray empty for remainder
- Widget sizes: Small (16px) for display, Medium (24px) for input

### Date Format
- Storage: Full date (YYYY-MM-DD)
- UI: Date picker with "Today" quick button
- Privacy: Not a concern for personal app

### Navigation
- "Add Movie" button in Log view → jumps to Search view
- No inline search in Log view for now (keep it simple)

### Delete Action
- Simple confirmation dialog (no undo/toast)
- Direct deletion after confirmation

### View Layout
- Start with **grid view** (like search)
- Future: May add list view toggle
- FlowBox with LogEntryCards

## Step-by-Step Implementation

### Step 1: Database Schema Migration
**File**: `src/services/database.js`

**Changes**:
1. Add `movie_logs` table:
   ```sql
   CREATE TABLE movie_logs (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       movie_id INTEGER NOT NULL,
       user_rating REAL CHECK(user_rating >= 1 AND user_rating <= 5),
       watched_date DATE NOT NULL,
       notes TEXT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
       UNIQUE(movie_id)
   );
   ```
2. Update `schema_version` to '2'
3. Add migration logic in `initialize()`

**Methods to add**:
- `logMovie(movieId, rating, date, notes)` - Insert or update
- `getMovieLogs(filters)` - Get all logs with movie data
- `getLogEntry(movieId)` - Get specific log
- `updateLogEntry(logId, rating, date, notes)` - Update existing
- `deleteLogEntry(logId)` - Delete log
- `isMovieLogged(movieId)` - Check if logged

**Testing**:
- Migration runs without errors
- New table created successfully
- Methods work with test data

### Step 2: Rating Widget
**File**: `src/widgets/rating-widget.js`

**Features**:
- GObject.registerClass with 'rating' property (1-5)
- 5 star buttons in horizontal box
- Visual states: gold filled, gray empty
- Interactive: click to set rating
- Read-only mode for display

**Testing**:
- Widget displays correctly
- Clicking updates rating property
- Stars render properly

### Step 3: Log Entry Dialog
**File**: `src/widgets/log-entry-dialog.js`

**UI**:
- Header: Movie poster thumbnail + title
- Date row: EntryRow with calendar popover + "Today" button
- Rating row: EntryRow with RatingWidget
- Notes row: EntryRow (multiline text)
- Buttons: Save (suggested), Cancel, Delete (destructive, when editing)

**Logic**:
- Constructor takes movie object + optional existing log
- Validate: rating (1-5), date (required)
- Save: Call database.logMovie()
- Signals: 'saved', 'deleted', 'cancelled'

**Testing**:
- Dialog opens correctly
- Date picker works
- "Today" button fills current date
- Can set rating
- Can enter notes
- Save creates/updates database entry

### Step 4: Update Movie Details Dialog
**File**: `src/widgets/movie-details-dialog.js`

**Changes**:
- Add action buttons in footer
- Primary: "Log Movie" (not logged) / "Edit Log" (logged)
- Secondary: "Add to Watchlist" (placeholder)
- If logged: Show rating and date in header
- Click opens LogEntryDialog

**Testing**:
- Button shows correct state
- Clicking opens LogEntryDialog
- After save, UI updates

### Step 5: Log Entry Card
**File**: `src/widgets/log-entry-card.js`

**UI**:
- Movie poster thumbnail
- Title + year
- Rating overlay (bottom-right corner)
- Date text (small, below title)
- Click: Open MovieDetailsDialog
- Right-click or menu: Edit/Delete

**Testing**:
- Displays movie info correctly
- Rating visible
- Click handling works

### Step 6: Implement Log View
**File**: `src/views/log-view.js`

**Layout**:
- Header: "Your Movie Log" + "Add Movie" button
- Filter bar:
  - Year filter (dropdown: All, 2024, 2023, ...)
  - Sort: Date Watched, Rating (high-low, low-high), Title
- Content: FlowBox with LogEntryCards
- Empty state: "Start logging movies..." + button to search

**Logic**:
- Query database on activation
- Filter by year
- Sort options
- Refresh on entry changes

**Testing**:
- Displays logged movies
- Filters work
- Sort works
- Empty state shows correctly

### Step 7: Window Integration
**File**: `src/window.js`

**Changes**:
- Pass database to LogView
- Connect signals
- Handle "Add Movie" button → switch to search
- Refresh log view when entries change

### Step 8: Testing & Polish
**Test Cases**:
- Log a new movie from search
- View in Log view
- Edit rating
- Edit date
- Edit notes
- Delete with confirmation
- Try to log same movie twice (should edit)
- Empty state
- Filters (year, sort)
- Restart app - data persists

**Edge Cases**:
- Future date (prevent or allow?)
- Very long notes
- Missing poster
- Special characters in notes

## Files to Create/Modify

### New Files
1. `src/widgets/rating-widget.js`
2. `src/widgets/log-entry-dialog.js`
3. `src/widgets/log-entry-card.js`

### Modified Files
1. `src/services/database.js` - Schema + methods
2. `src/widgets/movie-details-dialog.js` - Add actions
3. `src/views/log-view.js` - Full implementation
4. `src/window.js` - Integration

## Testing Protocol

### Automated Tests (Me)
- SQL syntax validation
- Migration logic
- Database method unit tests (CLI)

### Manual UI Tests (You)
- Each step UI after implementation
- Full workflow test
- Edge cases

## Notes

- Keep it simple for MVP
- Test each step before proceeding
- Don't worry about perfect grid layout initially
- Focus on functionality over aesthetics
- Save frequently, commit working code

## Status

- [x] Step 1: Database Schema
- [x] Step 2: Rating Widget
- [x] Step 3: Log Entry Dialog
- [x] Step 4: Update Details Dialog
- [x] Step 5: Log Entry Card
- [x] Step 6: Log View
- [x] Step 7: Window Integration
- [x] Step 8: Testing & Polish

**Phase 4 Complete! ✅**
