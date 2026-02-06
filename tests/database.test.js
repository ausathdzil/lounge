/* database.test.js
 *
 * Unit tests for DatabaseService.
 *
 * Run: gjs -m tests/database.test.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { describe, it, xit, beforeEach, afterEach, assert, printResults, makeTempDir } from './runner.js';
import { DatabaseService } from '../src/services/database.js';

// ── Helpers ─────────────────────────────────────────────────────────

/** Create a DatabaseService pointing at an isolated temp directory. */
function createTestDb(tmpDir) {
    const db = new DatabaseService();
    db._dataDir = tmpDir;
    db._dbPath = GLib.build_filenamev([tmpDir, 'test.db']);
    db._initialized = false;
    return db;
}

/** Recursively remove a directory tree. */
function rmrf(path) {
    const dir = Gio.File.new_for_path(path);
    if (!dir.query_exists(null)) return;

    const enumerator = dir.enumerate_children(
        'standard::name,standard::type',
        Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
        null
    );
    let info;
    while ((info = enumerator.next_file(null)) !== null) {
        const child = dir.get_child(info.get_name());
        if (info.get_file_type() === Gio.FileType.DIRECTORY) {
            rmrf(child.get_path());
        } else {
            child.delete(null);
        }
    }
    dir.delete(null);
}

/** A sample movie object matching what the app passes to cacheMovie(). */
function sampleMovie(overrides = {}) {
    return {
        id: 550,
        title: 'Fight Club',
        original_title: 'Fight Club',
        year: 1999,
        poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
        backdrop_path: '/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg',
        overview: 'A ticking-Loss time bomb.',
        runtime: 139,
        genres: 'Drama, Thriller',
        director: 'David Fincher',
        tmdb_rating: 8.4,
        ...overrides,
    };
}

// ── Test state ──────────────────────────────────────────────────────

let tmpDir;
let db;

// ── Test suites ─────────────────────────────────────────────────────

await describe('Database Initialization', () => {
    beforeEach(async () => {
        tmpDir = makeTempDir();
        db = createTestDb(tmpDir);
    });

    afterEach(async () => {
        rmrf(tmpDir);
    });

    it('should create database file on first initialize()', async () => {
        await db.initialize();
        const dbFile = Gio.File.new_for_path(db._dbPath);
        assert.ok(dbFile.query_exists(null), 'Database file should exist');
    });

    it('should set schema version to 2', async () => {
        await db.initialize();
        const version = await db._getSchemaVersion();
        assert.equal(version, '2');
    });

    it('should be idempotent (double initialize)', async () => {
        await db.initialize();
        await db.initialize(); // should not throw
        const version = await db._getSchemaVersion();
        assert.equal(version, '2');
    });

    it('should create movies table', async () => {
        await db.initialize();
        const results = await db.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='movies';"
        );
        assert.equal(results.length, 1);
        assert.equal(results[0].name, 'movies');
    });

    it('should create movie_logs table', async () => {
        await db.initialize();
        const results = await db.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='movie_logs';"
        );
        assert.equal(results.length, 1);
        assert.equal(results[0].name, 'movie_logs');
    });
});

await describe('cacheMovie()', () => {
    beforeEach(async () => {
        tmpDir = makeTempDir();
        db = createTestDb(tmpDir);
        await db.initialize();
    });

    afterEach(async () => {
        rmrf(tmpDir);
    });

    it('should insert a new movie', async () => {
        const movie = sampleMovie();
        await db.cacheMovie(movie);

        const result = await db.getMovie(550);
        assert.isNotNull(result);
        assert.equal(result.title, 'Fight Club');
        assert.equal(result.year, 1999);
        assert.equal(result.runtime, 139);
        assert.equal(result.director, 'David Fincher');
    });

    it('should update an existing movie (INSERT OR REPLACE)', async () => {
        await db.cacheMovie(sampleMovie());
        await db.cacheMovie(sampleMovie({ title: 'Fight Club (Updated)' }));

        const result = await db.getMovie(550);
        assert.equal(result.title, 'Fight Club (Updated)');
    });

    it('should handle movies with null optional fields', async () => {
        const movie = sampleMovie({
            original_title: null,
            poster_path: null,
            backdrop_path: null,
            overview: null,
            runtime: null,
            genres: null,
            director: null,
            tmdb_rating: null,
        });
        await db.cacheMovie(movie);

        const result = await db.getMovie(550);
        assert.isNotNull(result);
        assert.equal(result.title, 'Fight Club');
    });

    it('should handle special characters in title (SQL escaping)', async () => {
        const movie = sampleMovie({
            id: 999,
            title: "It's a Wonderful Life",
            overview: "He's got a \"great\" plan",
        });
        await db.cacheMovie(movie);

        const result = await db.getMovie(999);
        assert.isNotNull(result);
        assert.equal(result.title, "It's a Wonderful Life");
    });
});

await describe('getMovie()', () => {
    beforeEach(async () => {
        tmpDir = makeTempDir();
        db = createTestDb(tmpDir);
        await db.initialize();
    });

    afterEach(async () => {
        rmrf(tmpDir);
    });

    it('should return null for non-existent movie', async () => {
        const result = await db.getMovie(99999);
        assert.isNull(result);
    });

    it('should retrieve movie by TMDB ID', async () => {
        await db.cacheMovie(sampleMovie());
        const result = await db.getMovie(550);
        assert.isNotNull(result);
        assert.equal(result.id, 550);
        assert.equal(result.genres, 'Drama, Thriller');
    });
});

await describe('logMovie()', () => {
    beforeEach(async () => {
        tmpDir = makeTempDir();
        db = createTestDb(tmpDir);
        await db.initialize();
        await db.cacheMovie(sampleMovie());
    });

    afterEach(async () => {
        rmrf(tmpDir);
    });

    it('should create a new log entry', async () => {
        await db.logMovie(550, 4.5, '2025-01-15', 'Great movie');

        const entry = await db.getLogEntry(550);
        assert.isNotNull(entry);
        assert.equal(entry.movie_id, 550);
        assert.equal(entry.user_rating, 4.5);
        assert.equal(entry.watched_date, '2025-01-15');
        assert.equal(entry.notes, 'Great movie');
        assert.equal(entry.title, 'Fight Club'); // joined data
    });

    it('should update existing log (UPSERT via ON CONFLICT)', async () => {
        await db.logMovie(550, 3, '2025-01-10', 'First watch');
        await db.logMovie(550, 5, '2025-01-20', 'Second watch - even better');

        const entry = await db.getLogEntry(550);
        assert.equal(entry.user_rating, 5);
        assert.equal(entry.watched_date, '2025-01-20');
        assert.equal(entry.notes, 'Second watch - even better');
    });

    it('should fail if movie is not cached', async () => {
        await assert.rejects(
            () => db.logMovie(99999, 4, '2025-01-15', ''),
            'Should reject when movie not cached'
        );
    });

    it('should handle empty notes', async () => {
        await db.logMovie(550, 4, '2025-01-15');

        const entry = await db.getLogEntry(550);
        assert.isNotNull(entry);
        assert.equal(entry.notes, '');
    });

    it('should handle notes with special characters', async () => {
        await db.logMovie(550, 4, '2025-01-15', "It's got some 'wild' scenes");

        const entry = await db.getLogEntry(550);
        assert.equal(entry.notes, "It's got some 'wild' scenes");
    });
});

await describe('getLogEntry()', () => {
    beforeEach(async () => {
        tmpDir = makeTempDir();
        db = createTestDb(tmpDir);
        await db.initialize();
    });

    afterEach(async () => {
        rmrf(tmpDir);
    });

    it('should return null for non-existent log', async () => {
        const result = await db.getLogEntry(99999);
        assert.isNull(result);
    });

    it('should return joined movie + log data', async () => {
        await db.cacheMovie(sampleMovie());
        await db.logMovie(550, 4, '2025-01-15', 'Nice');

        const entry = await db.getLogEntry(550);
        assert.isNotNull(entry);
        // Log fields
        assert.ok(entry.log_id, 'Should have log_id');
        assert.equal(entry.movie_id, 550);
        assert.equal(entry.user_rating, 4);
        assert.equal(entry.watched_date, '2025-01-15');
        assert.equal(entry.notes, 'Nice');
        // Joined movie fields
        assert.equal(entry.title, 'Fight Club');
        assert.equal(entry.year, 1999);
        assert.equal(entry.director, 'David Fincher');
    });
});

await describe('getMovieLogs()', () => {
    beforeEach(async () => {
        tmpDir = makeTempDir();
        db = createTestDb(tmpDir);
        await db.initialize();

        // Seed three movies
        await db.cacheMovie(sampleMovie({ id: 1, title: 'Alpha' }));
        await db.cacheMovie(sampleMovie({ id: 2, title: 'Beta' }));
        await db.cacheMovie(sampleMovie({ id: 3, title: 'Gamma' }));

        await db.logMovie(1, 3, '2025-01-10', '');
        await db.logMovie(2, 5, '2025-01-20', '');
        await db.logMovie(3, 1, '2025-01-15', '');
    });

    afterEach(async () => {
        rmrf(tmpDir);
    });

    it('should return all log entries', async () => {
        const logs = await db.getMovieLogs();
        assert.equal(logs.length, 3);
    });

    it('should sort by watched_date DESC by default', async () => {
        const logs = await db.getMovieLogs();
        assert.equal(logs[0].title, 'Beta');   // 2025-01-20
        assert.equal(logs[1].title, 'Gamma');  // 2025-01-15
        assert.equal(logs[2].title, 'Alpha');  // 2025-01-10
    });

    it('should sort by rating DESC', async () => {
        const logs = await db.getMovieLogs({ sortBy: 'rating', sortOrder: 'DESC' });
        assert.equal(logs[0].user_rating, 5);
        assert.equal(logs[1].user_rating, 3);
        assert.equal(logs[2].user_rating, 1);
    });

    it('should sort by title ASC', async () => {
        const logs = await db.getMovieLogs({ sortBy: 'title', sortOrder: 'ASC' });
        assert.equal(logs[0].title, 'Alpha');
        assert.equal(logs[1].title, 'Beta');
        assert.equal(logs[2].title, 'Gamma');
    });

    it('should return empty array when no logs exist', async () => {
        // Use a fresh db
        const freshDir = makeTempDir();
        const freshDb = createTestDb(freshDir);
        await freshDb.initialize();

        const logs = await freshDb.getMovieLogs();
        assert.deepEqual(logs, []);

        rmrf(freshDir);
    });
});

await describe('updateLogEntry()', () => {
    beforeEach(async () => {
        tmpDir = makeTempDir();
        db = createTestDb(tmpDir);
        await db.initialize();
        await db.cacheMovie(sampleMovie());
        await db.logMovie(550, 3, '2025-01-10', 'Initial');
    });

    afterEach(async () => {
        rmrf(tmpDir);
    });

    it('should update rating, date, and notes', async () => {
        const entry = await db.getLogEntry(550);
        await db.updateLogEntry(entry.log_id, 5, '2025-02-01', 'Updated notes');

        const updated = await db.getLogEntry(550);
        assert.equal(updated.user_rating, 5);
        assert.equal(updated.watched_date, '2025-02-01');
        assert.equal(updated.notes, 'Updated notes');
    });
});

await describe('deleteLogEntry()', () => {
    beforeEach(async () => {
        tmpDir = makeTempDir();
        db = createTestDb(tmpDir);
        await db.initialize();
        await db.cacheMovie(sampleMovie());
        await db.logMovie(550, 4, '2025-01-15', 'To be deleted');
    });

    afterEach(async () => {
        rmrf(tmpDir);
    });

    it('should remove the log entry', async () => {
        const entry = await db.getLogEntry(550);
        assert.isNotNull(entry);

        await db.deleteLogEntry(entry.log_id);

        const deleted = await db.getLogEntry(550);
        assert.isNull(deleted);
    });

    it('should not remove the cached movie', async () => {
        const entry = await db.getLogEntry(550);
        await db.deleteLogEntry(entry.log_id);

        const movie = await db.getMovie(550);
        assert.isNotNull(movie, 'Movie should still be cached');
    });
});

await describe('isMovieLogged()', () => {
    beforeEach(async () => {
        tmpDir = makeTempDir();
        db = createTestDb(tmpDir);
        await db.initialize();
        await db.cacheMovie(sampleMovie());
    });

    afterEach(async () => {
        rmrf(tmpDir);
    });

    it('should return false for unlogged movie', async () => {
        const result = await db.isMovieLogged(550);
        assert.equal(result, false);
    });

    it('should return true for logged movie', async () => {
        await db.logMovie(550, 4, '2025-01-15', '');
        const result = await db.isMovieLogged(550);
        assert.equal(result, true);
    });

    it('should return false after deleting a log', async () => {
        await db.logMovie(550, 4, '2025-01-15', '');
        const entry = await db.getLogEntry(550);
        await db.deleteLogEntry(entry.log_id);

        const result = await db.isMovieLogged(550);
        assert.equal(result, false);
    });
});

// ── Print results and exit ──────────────────────────────────────────

const failures = printResults();

if (failures > 0) {
    // Use imports.system for exit code in GJS
    imports.system.exit(1);
}
