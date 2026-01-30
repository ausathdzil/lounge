/* database.js
 *
 * Copyright 2026 Ausath Ikram
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

export class DatabaseService {
    constructor() {
        // Database path: ~/.local/share/lounge/lounge.db
        const dataDir = GLib.build_filenamev([
            GLib.get_user_data_dir(),
            'lounge'
        ]);
        
        this._dbPath = GLib.build_filenamev([dataDir, 'lounge.db']);
        this._dataDir = dataDir;
        this._initialized = false;
    }

    async initialize() {
        if (this._initialized) {
            return;
        }

        // Create data directory if it doesn't exist
        const dir = Gio.File.new_for_path(this._dataDir);
        if (!dir.query_exists(null)) {
            dir.make_directory_with_parents(null);
            log(`Created data directory: ${this._dataDir}`);
        }

        // Check if database exists
        const dbFile = Gio.File.new_for_path(this._dbPath);
        const dbExists = dbFile.query_exists(null);

        if (!dbExists) {
            log(`Initializing new database at: ${this._dbPath}`);
            await this._createSchema();
        } else {
            // Check schema version and migrate if needed
            const version = await this._getSchemaVersion();
            if (version !== '2') {
                await this._migrateSchema(version);
            }
        }

        this._initialized = true;
        log('Database service initialized');
    }

    async _getSchemaVersion() {
        try {
            // Use raw query execution since we're still initializing
            const sql = "SELECT value FROM app_metadata WHERE key = 'schema_version'";
            const stdout = await this._execute(sql);
            if (stdout && stdout.trim()) {
                const result = JSON.parse(stdout);
                return result.length > 0 ? result[0].value : '1';
            }
            return '1';
        } catch (e) {
            return '1'; // Default to v1 if query fails
        }
    }

    async _createSchema() {
        const schema = `
            CREATE TABLE IF NOT EXISTS movies (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                original_title TEXT,
                year INTEGER,
                poster_path TEXT,
                backdrop_path TEXT,
                overview TEXT,
                runtime INTEGER,
                genres TEXT,
                director TEXT,
                tmdb_rating REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            INSERT INTO app_metadata (key, value) VALUES ('schema_version', '2');

            CREATE TABLE IF NOT EXISTS movie_logs (
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

            CREATE INDEX IF NOT EXISTS idx_movie_logs_movie_id ON movie_logs(movie_id);
            CREATE INDEX IF NOT EXISTS idx_movie_logs_date ON movie_logs(watched_date);
        `;

        await this._execute(schema);
        log('Database schema v2 created');
    }

    async _migrateSchema(currentVersion) {
        if (currentVersion === '1') {
            log('Migrating database from v1 to v2...');
            
            const migration = `
                CREATE TABLE IF NOT EXISTS movie_logs (
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

                CREATE INDEX IF NOT EXISTS idx_movie_logs_movie_id ON movie_logs(movie_id);
                CREATE INDEX IF NOT EXISTS idx_movie_logs_date ON movie_logs(watched_date);

                UPDATE app_metadata SET value = '2' WHERE key = 'schema_version';
            `;

            await this._execute(migration);
            log('Database migration to v2 complete');
        }
    }

    async _execute(sql, params = []) {
        return new Promise((resolve, reject) => {
            try {
                // Build SQLite command
                const args = ['sqlite3', this._dbPath, sql];
                
                const proc = Gio.Subprocess.new(
                    args,
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );

                proc.communicate_utf8_async(null, null, (proc, res) => {
                    try {
                        const [, stdout, stderr] = proc.communicate_utf8_finish(res);
                        
                        if (!proc.get_successful()) {
                            reject(new Error(`SQLite error: ${stderr}`));
                            return;
                        }

                        resolve(stdout);
                    } catch (e) {
                        reject(e);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    async query(sql) {
        if (!this._initialized) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            try {
                const args = ['sqlite3', '-json', this._dbPath, sql];
                
                const proc = Gio.Subprocess.new(
                    args,
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );

                proc.communicate_utf8_async(null, null, (proc, res) => {
                    try {
                        const [, stdout, stderr] = proc.communicate_utf8_finish(res);
                        
                        if (!proc.get_successful()) {
                            reject(new Error(`SQLite error: ${stderr}`));
                            return;
                        }

                        // Parse JSON output
                        if (stdout && stdout.trim()) {
                            const results = JSON.parse(stdout);
                            resolve(results);
                        } else {
                            resolve([]);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    async cacheMovie(movieData) {
        if (!this._initialized) {
            await this.initialize();
        }

        // Prepare SQL for INSERT OR REPLACE
        const sql = `
            INSERT OR REPLACE INTO movies (
                id, title, original_title, year, poster_path, 
                backdrop_path, overview, runtime, genres, 
                director, tmdb_rating
            ) VALUES (
                ${movieData.id},
                '${this._escape(movieData.title)}',
                '${this._escape(movieData.original_title || '')}',
                ${movieData.year || 'NULL'},
                '${this._escape(movieData.poster_path || '')}',
                '${this._escape(movieData.backdrop_path || '')}',
                '${this._escape(movieData.overview || '')}',
                ${movieData.runtime || 'NULL'},
                '${this._escape(movieData.genres || '')}',
                '${this._escape(movieData.director || '')}',
                ${movieData.tmdb_rating || 'NULL'}
            );
        `;

        await this._execute(sql);
        log(`Cached movie: ${movieData.title} (ID: ${movieData.id})`);
    }

    async getMovie(tmdbId) {
        if (!this._initialized) {
            await this.initialize();
        }

        const sql = `SELECT * FROM movies WHERE id = ${tmdbId};`;
        const results = await this.query(sql);
        
        return results.length > 0 ? results[0] : null;
    }

    _escape(str) {
        if (!str) return '';
        return str.replace(/'/g, "''");
    }

    getDbPath() {
        return this._dbPath;
    }

    // Movie Logging Methods

    async logMovie(movieId, rating, watchedDate, notes = '') {
        if (!this._initialized) {
            await this.initialize();
        }

        // First, ensure movie exists in movies table
        const movieExists = await this.getMovie(movieId);
        if (!movieExists) {
            throw new Error(`Movie ${movieId} must be cached before logging`);
        }

        const sql = `
            INSERT INTO movie_logs (movie_id, user_rating, watched_date, notes)
            VALUES (${movieId}, ${rating}, '${watchedDate}', '${this._escape(notes)}')
            ON CONFLICT(movie_id) DO UPDATE SET
                user_rating = ${rating},
                watched_date = '${watchedDate}',
                notes = '${this._escape(notes)}',
                updated_at = CURRENT_TIMESTAMP;
        `;

        await this._execute(sql);
        log(`Logged movie: ID ${movieId}, Rating: ${rating}, Date: ${watchedDate}`);
    }

    async getMovieLogs(filters = {}) {
        if (!this._initialized) {
            await this.initialize();
        }

        let sql = `
            SELECT 
                ml.id as log_id,
                ml.movie_id,
                ml.user_rating,
                ml.watched_date,
                ml.notes,
                ml.created_at,
                m.title,
                m.year,
                m.poster_path,
                m.runtime,
                m.genres,
                m.director,
                m.tmdb_rating
            FROM movie_logs ml
            JOIN movies m ON ml.movie_id = m.id
        `;

        const conditions = [];
        
        if (filters.year) {
            conditions.push(`strftime('%Y', ml.watched_date) = '${filters.year}'`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        // Sorting
        const sortField = filters.sortBy || 'watched_date';
        const sortOrder = filters.sortOrder || 'DESC';
        
        switch (sortField) {
            case 'watched_date':
                sql += ` ORDER BY ml.watched_date ${sortOrder}`;
                break;
            case 'rating':
                sql += ` ORDER BY ml.user_rating ${sortOrder}`;
                break;
            case 'title':
                sql += ` ORDER BY m.title ${sortOrder}`;
                break;
            default:
                sql += ` ORDER BY ml.watched_date DESC`;
        }

        return await this.query(sql);
    }

    async getLogEntry(movieId) {
        if (!this._initialized) {
            await this.initialize();
        }

        const sql = `
            SELECT 
                ml.id as log_id,
                ml.movie_id,
                ml.user_rating,
                ml.watched_date,
                ml.notes,
                ml.created_at,
                m.title,
                m.year,
                m.poster_path,
                m.runtime,
                m.genres,
                m.director,
                m.tmdb_rating
            FROM movie_logs ml
            JOIN movies m ON ml.movie_id = m.id
            WHERE ml.movie_id = ${movieId}
            LIMIT 1;
        `;

        const results = await this.query(sql);
        return results.length > 0 ? results[0] : null;
    }

    async updateLogEntry(logId, rating, watchedDate, notes) {
        if (!this._initialized) {
            await this.initialize();
        }

        const sql = `
            UPDATE movie_logs 
            SET user_rating = ${rating},
                watched_date = '${watchedDate}',
                notes = '${this._escape(notes)}',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${logId};
        `;

        await this._execute(sql);
        log(`Updated log entry: ${logId}`);
    }

    async deleteLogEntry(logId) {
        if (!this._initialized) {
            await this.initialize();
        }

        const sql = `DELETE FROM movie_logs WHERE id = ${logId};`;
        await this._execute(sql);
        log(`Deleted log entry: ${logId}`);
    }

    async isMovieLogged(movieId) {
        if (!this._initialized) {
            await this.initialize();
        }

        const sql = `SELECT COUNT(*) as count FROM movie_logs WHERE movie_id = ${movieId};`;
        const results = await this.query(sql);
        return results.length > 0 && results[0].count > 0;
    }
}
