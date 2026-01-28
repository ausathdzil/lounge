/* tmdb.js
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

import Soup from 'gi://Soup?version=3.0';
import GLib from 'gi://GLib';

export class TMDBService {
    constructor(apiKey) {
        this._apiKey = apiKey;
        this._baseUrl = 'https://api.themoviedb.org/3';
        this._imageBaseUrl = 'https://image.tmdb.org/t/p/';
        this._session = new Soup.Session();
    }

    setApiKey(apiKey) {
        this._apiKey = apiKey;
    }

    async searchMovies(query, page = 1) {
        if (!this._apiKey) {
            throw new Error('TMDB API key not set');
        }

        const url = `${this._baseUrl}/search/movie?api_key=${this._apiKey}&query=${encodeURIComponent(query)}&page=${page}`;
        
        try {
            const response = await this._makeRequest(url);
            
            // Transform results to our format
            const movies = response.results.map(movie => ({
                id: movie.id,
                title: movie.title,
                original_title: movie.original_title,
                year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null,
                poster_path: movie.poster_path,
                backdrop_path: movie.backdrop_path,
                overview: movie.overview,
                tmdb_rating: movie.vote_average,
            }));

            return {
                results: movies,
                page: response.page,
                total_pages: response.total_pages,
                total_results: response.total_results,
            };
        } catch (error) {
            logError(error, 'Failed to search movies');
            throw error;
        }
    }

    async getMovieDetails(movieId) {
        if (!this._apiKey) {
            throw new Error('TMDB API key not set');
        }

        const url = `${this._baseUrl}/movie/${movieId}?api_key=${this._apiKey}`;
        
        try {
            const movie = await this._makeRequest(url);
            
            // Get credits to extract director
            const director = await this._getDirector(movieId);

            // Transform to our format
            return {
                id: movie.id,
                title: movie.title,
                original_title: movie.original_title,
                year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null,
                poster_path: movie.poster_path,
                backdrop_path: movie.backdrop_path,
                overview: movie.overview,
                runtime: movie.runtime,
                genres: movie.genres.map(g => g.name).join(', '),
                director: director,
                tmdb_rating: movie.vote_average,
            };
        } catch (error) {
            logError(error, `Failed to get movie details for ID ${movieId}`);
            throw error;
        }
    }

    async _getDirector(movieId) {
        const url = `${this._baseUrl}/movie/${movieId}/credits?api_key=${this._apiKey}`;
        
        try {
            const credits = await this._makeRequest(url);
            const director = credits.crew.find(person => person.job === 'Director');
            return director ? director.name : 'Unknown';
        } catch (error) {
            logError(error, `Failed to get director for movie ID ${movieId}`);
            return 'Unknown';
        }
    }

    async testConnection() {
        if (!this._apiKey) {
            throw new Error('TMDB API key not set');
        }

        // Test by fetching configuration (lightweight endpoint)
        const url = `${this._baseUrl}/configuration?api_key=${this._apiKey}`;
        
        try {
            await this._makeRequest(url);
            return true;
        } catch (error) {
            if (error.message.includes('401')) {
                throw new Error('Invalid API key');
            }
            throw error;
        }
    }

    async _makeRequest(url) {
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

                        const decoder = new TextDecoder('utf-8');
                        const text = decoder.decode(bytes.get_data());
                        const data = JSON.parse(text);

                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    getPosterUrl(posterPath, size = 'w342') {
        if (!posterPath) return null;
        return `${this._imageBaseUrl}${size}${posterPath}`;
    }

    getBackdropUrl(backdropPath, size = 'w780') {
        if (!backdropPath) return null;
        return `${this._imageBaseUrl}${size}${backdropPath}`;
    }

    getOriginalPosterUrl(posterPath) {
        return this.getPosterUrl(posterPath, 'original');
    }

    getOriginalBackdropUrl(backdropPath) {
        return this.getBackdropUrl(backdropPath, 'original');
    }
}
