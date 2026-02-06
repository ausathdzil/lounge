# MVP Polishing: Testing - Database

**Goal:** Unit tests for database operations

**Status:** ✅ Complete (29 tests passing)

---

## Test File: `tests/database.test.js`

### Database Initialization
- [x] Test database creation on first run
- [x] Test schema version detection
- [x] Test idempotent initialization (double init)
- [x] Test movies table creation
- [x] Test movie_logs table creation

### Movie Operations
- [x] `cacheMovie()` - Insert new movie
- [x] `cacheMovie()` - Update existing movie (INSERT OR REPLACE)
- [x] `cacheMovie()` - Handle null optional fields
- [x] `cacheMovie()` - Handle special characters (SQL escaping)
- [x] `getMovie()` - Retrieve by TMDB ID
- [x] `getMovie()` - Non-existent movie returns null

### Logging Operations
- [x] `logMovie()` - Create new log entry
- [x] `logMovie()` - Update existing log (UPSERT via ON CONFLICT)
- [x] `logMovie()` - Fails if movie not cached (foreign key)
- [x] `logMovie()` - Handle empty notes
- [x] `logMovie()` - Handle notes with special characters
- [x] `getLogEntry()` - Return null for non-existent log
- [x] `getLogEntry()` - Return joined movie + log data
- [x] `getMovieLogs()` - Get all log entries
- [x] `getMovieLogs()` - Sort by watched_date DESC (default)
- [x] `getMovieLogs()` - Sort by rating DESC
- [x] `getMovieLogs()` - Sort by title ASC
- [x] `getMovieLogs()` - Return empty array when no logs
- [x] `updateLogEntry()` - Update rating, date, and notes
- [x] `deleteLogEntry()` - Remove log entry
- [x] `deleteLogEntry()` - Preserve cached movie
- [x] `isMovieLogged()` - Return false for unlogged movie
- [x] `isMovieLogged()` - Return true for logged movie
- [x] `isMovieLogged()` - Return false after deleting log

---

## Bug Fix Found During Testing

`_getSchemaVersion()` was calling `_execute()` (no `-json` flag) then trying to `JSON.parse()` the output. This always failed silently and defaulted to version `'1'`. Fixed by adding `_executeJson()` method that passes `-json` to sqlite3.

## Testing Approach

GJS-native tests using `gjs -m`. Tests run against real `sqlite3` with isolated temp databases per test. No mocking needed.

Run: `gjs -m tests/database.test.js`
