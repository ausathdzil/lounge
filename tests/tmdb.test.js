/* tmdb.test.js
 *
 * Unit tests for TMDBService (pure/synchronous methods).
 *
 * Run: gjs -m tests/tmdb.test.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, it, xit, assert, printResults } from './runner.js';
import { TMDBService } from '../src/services/tmdb.js';

// ── Test suites ─────────────────────────────────────────────────────

await describe('getPosterUrl()', () => {
    it('should generate correct poster URL with default size', () => {
        const tmdb = new TMDBService('test-key');
        const url = tmdb.getPosterUrl('/abc123.jpg');
        assert.equal(url, 'https://image.tmdb.org/t/p/w342/abc123.jpg');
    });

    it('should generate correct poster URL with custom size', () => {
        const tmdb = new TMDBService('test-key');
        const url = tmdb.getPosterUrl('/abc123.jpg', 'w500');
        assert.equal(url, 'https://image.tmdb.org/t/p/w500/abc123.jpg');
    });

    it('should return null for null poster path', () => {
        const tmdb = new TMDBService('test-key');
        const url = tmdb.getPosterUrl(null);
        assert.isNull(url);
    });

    it('should return null for empty string poster path', () => {
        const tmdb = new TMDBService('test-key');
        const url = tmdb.getPosterUrl('');
        assert.isNull(url);
    });
});

await describe('getBackdropUrl()', () => {
    it('should generate correct backdrop URL with default size', () => {
        const tmdb = new TMDBService('test-key');
        const url = tmdb.getBackdropUrl('/backdrop.jpg');
        assert.equal(url, 'https://image.tmdb.org/t/p/w780/backdrop.jpg');
    });

    it('should generate correct backdrop URL with custom size', () => {
        const tmdb = new TMDBService('test-key');
        const url = tmdb.getBackdropUrl('/backdrop.jpg', 'w1280');
        assert.equal(url, 'https://image.tmdb.org/t/p/w1280/backdrop.jpg');
    });

    it('should return null for null backdrop path', () => {
        const tmdb = new TMDBService('test-key');
        const url = tmdb.getBackdropUrl(null);
        assert.isNull(url);
    });
});

await describe('getOriginalPosterUrl()', () => {
    it('should generate URL with original size', () => {
        const tmdb = new TMDBService('test-key');
        const url = tmdb.getOriginalPosterUrl('/poster.jpg');
        assert.equal(url, 'https://image.tmdb.org/t/p/original/poster.jpg');
    });

    it('should return null for null path', () => {
        const tmdb = new TMDBService('test-key');
        const url = tmdb.getOriginalPosterUrl(null);
        assert.isNull(url);
    });
});

await describe('getOriginalBackdropUrl()', () => {
    it('should generate URL with original size', () => {
        const tmdb = new TMDBService('test-key');
        const url = tmdb.getOriginalBackdropUrl('/backdrop.jpg');
        assert.equal(url, 'https://image.tmdb.org/t/p/original/backdrop.jpg');
    });

    it('should return null for null path', () => {
        const tmdb = new TMDBService('test-key');
        const url = tmdb.getOriginalBackdropUrl(null);
        assert.isNull(url);
    });
});

await describe('setApiKey()', () => {
    it('should update the API key', () => {
        const tmdb = new TMDBService('old-key');
        tmdb.setApiKey('new-key');
        assert.equal(tmdb._apiKey, 'new-key');
    });

    it('should allow setting key to empty string', () => {
        const tmdb = new TMDBService('some-key');
        tmdb.setApiKey('');
        assert.equal(tmdb._apiKey, '');
    });
});

await describe('searchMovies() - validation', () => {
    it('should throw without API key', async () => {
        const tmdb = new TMDBService('');
        await assert.rejects(
            () => tmdb.searchMovies('test'),
            'Should reject when API key is empty'
        );
    });

    it('should throw with null API key', async () => {
        const tmdb = new TMDBService(null);
        await assert.rejects(
            () => tmdb.searchMovies('test'),
            'Should reject when API key is null'
        );
    });
});

await describe('getMovieDetails() - validation', () => {
    it('should throw without API key', async () => {
        const tmdb = new TMDBService('');
        await assert.rejects(
            () => tmdb.getMovieDetails(550),
            'Should reject when API key is empty'
        );
    });
});

await describe('testConnection() - validation', () => {
    it('should throw without API key', async () => {
        const tmdb = new TMDBService('');
        await assert.rejects(
            () => tmdb.testConnection(),
            'Should reject when API key is empty'
        );
    });
});

await describe('constructor', () => {
    it('should set API key', () => {
        const tmdb = new TMDBService('my-key');
        assert.equal(tmdb._apiKey, 'my-key');
    });

    it('should set base URLs', () => {
        const tmdb = new TMDBService('key');
        assert.equal(tmdb._baseUrl, 'https://api.themoviedb.org/3');
        assert.equal(tmdb._imageBaseUrl, 'https://image.tmdb.org/t/p/');
    });

    it('should create a Soup session', () => {
        const tmdb = new TMDBService('key');
        assert.isNotNull(tmdb._session);
    });
});

// ── Print results and exit ──────────────────────────────────────────

const failures = printResults();

if (failures > 0) {
    imports.system.exit(1);
}
