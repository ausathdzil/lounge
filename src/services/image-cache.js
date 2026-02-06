/* image-cache.js
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
import Soup from 'gi://Soup?version=3.0';
import GdkPixbuf from 'gi://GdkPixbuf';

import { TMDB_POSTER_SIZE, TMDB_BACKDROP_SIZE } from '../utils/constants.js';

export class ImageCacheService {
    constructor() {
        // Cache directory: ~/.cache/lounge/
        this._cacheDir = GLib.build_filenamev([
            GLib.get_user_cache_dir(),
            'lounge'
        ]);

        this._postersDir = GLib.build_filenamev([this._cacheDir, 'posters']);
        this._backdropsDir = GLib.build_filenamev([this._cacheDir, 'backdrops']);

        this._session = new Soup.Session();

        this._ensureCacheDirs();
    }

    _ensureCacheDirs() {
        // Create cache directories if they don't exist
        const cacheDirFile = Gio.File.new_for_path(this._cacheDir);
        if (!cacheDirFile.query_exists(null)) {
            cacheDirFile.make_directory_with_parents(null);
            log(`Created cache directory: ${this._cacheDir}`);
        }

        const postersDirFile = Gio.File.new_for_path(this._postersDir);
        if (!postersDirFile.query_exists(null)) {
            postersDirFile.make_directory(null);
            log(`Created posters directory: ${this._postersDir}`);
        }

        const backdropsDirFile = Gio.File.new_for_path(this._backdropsDir);
        if (!backdropsDirFile.query_exists(null)) {
            backdropsDirFile.make_directory(null);
            log(`Created backdrops directory: ${this._backdropsDir}`);
        }
    }

    async getPosterPixbuf(movieId, posterPath, tmdbService, size = TMDB_POSTER_SIZE) {
        if (!posterPath) {
            return null;
        }

        // Check cache first
        const cachedPath = this._getCachedImagePath('poster', movieId, size);
        const cachedFile = Gio.File.new_for_path(cachedPath);

        if (cachedFile.query_exists(null)) {
            try {
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file(cachedPath);
                return pixbuf;
            } catch (error) {
                console.error(`Failed to load cached poster for movie ${movieId}:`, error);
                // Continue to download if cache read fails
            }
        }

        // Download from TMDB
        const url = tmdbService.getPosterUrl(posterPath, size);
        if (!url) {
            return null;
        }

        try {
            await this._downloadImage(url, cachedPath);
            const pixbuf = GdkPixbuf.Pixbuf.new_from_file(cachedPath);
            log(`Downloaded and cached poster for movie ${movieId}`);
            return pixbuf;
        } catch (error) {
            console.error(`Failed to download poster for movie ${movieId}:`, error);
            return null;
        }
    }

    async getBackdropPixbuf(movieId, backdropPath, tmdbService, size = TMDB_BACKDROP_SIZE) {
        if (!backdropPath) {
            return null;
        }

        // Check cache first
        const cachedPath = this._getCachedImagePath('backdrop', movieId, size);
        const cachedFile = Gio.File.new_for_path(cachedPath);

        if (cachedFile.query_exists(null)) {
            try {
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file(cachedPath);
                return pixbuf;
            } catch (error) {
                console.error(`Failed to load cached backdrop for movie ${movieId}:`, error);
                // Continue to download if cache read fails
            }
        }

        // Download from TMDB
        const url = tmdbService.getBackdropUrl(backdropPath, size);
        if (!url) {
            return null;
        }

        try {
            await this._downloadImage(url, cachedPath);
            const pixbuf = GdkPixbuf.Pixbuf.new_from_file(cachedPath);
            log(`Downloaded and cached backdrop for movie ${movieId}`);
            return pixbuf;
        } catch (error) {
            console.error(`Failed to download backdrop for movie ${movieId}:`, error);
            return null;
        }
    }

    async _downloadImage(url, localPath) {
        return new Promise((resolve, reject) => {
            const message = Soup.Message.new('GET', url);

            this._session.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                null,
                (session, result) => {
                    try {
                        const bytes = session.send_and_read_finish(result);
                        const status = message.get_status();

                        if (status !== 200) {
                            reject(new Error(`HTTP ${status}: ${message.get_reason_phrase()}`));
                            return;
                        }

                        // Save to file
                        const file = Gio.File.new_for_path(localPath);
                        const outputStream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                        outputStream.write_bytes(bytes, null);
                        outputStream.close(null);

                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    _getCachedImagePath(type, movieId, size) {
        const baseDir = type === 'poster' ? this._postersDir : this._backdropsDir;
        const filename = `${movieId}_${size}.jpg`;
        return GLib.build_filenamev([baseDir, filename]);
    }

    getCacheDir() {
        return this._cacheDir;
    }

    clearCache() {
        // Clear all cached images
        const postersDirFile = Gio.File.new_for_path(this._postersDir);
        const backdropsDirFile = Gio.File.new_for_path(this._backdropsDir);

        this._clearDirectory(postersDirFile);
        this._clearDirectory(backdropsDirFile);

        log('Image cache cleared');
    }

    _clearDirectory(directory) {
        try {
            const enumerator = directory.enumerate_children(
                'standard::name',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let fileInfo;
            while ((fileInfo = enumerator.next_file(null)) !== null) {
                const child = directory.get_child(fileInfo.get_name());
                child.delete(null);
            }
        } catch (error) {
            console.error('Failed to clear directory:', error);
        }
    }
}
