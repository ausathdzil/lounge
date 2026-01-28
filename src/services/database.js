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
        }

        this._initialized = true;
        log('Database service initialized');
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

            INSERT INTO app_metadata (key, value) VALUES ('schema_version', '1');
        `;

        await this._execute(schema);
        log('Database schema created');
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
}
