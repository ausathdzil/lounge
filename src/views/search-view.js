/* search-view.js
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

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';

import { MovieCard } from '../widgets/movie-card.js';

export const SearchView = GObject.registerClass({
    GTypeName: 'SearchView',
    Signals: {
        'movie-selected': {},
    },
}, class SearchView extends Gtk.Box {
    constructor(imageCache = null, tmdbService = null) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: true,
            vexpand: true,
        });

        this._imageCache = imageCache;
        this._tmdbService = tmdbService;
        this._searchTimeout = null;
        this._searchEntry = null;

        this._buildUI();
    }

    setSearchEntry(entry) {
        this._searchEntry = entry;

        // Connect search with debounce
        this._searchEntry.connect('search-changed', () => {
            if (this._searchTimeout) {
                GLib.source_remove(this._searchTimeout);
            }

            this._searchTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                this._onSearchChanged();
                this._searchTimeout = null;
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    _buildUI() {
        // Stack for different states
        this._stack = new Gtk.Stack({
            vexpand: true,
            transition_type: Gtk.StackTransitionType.CROSSFADE,
        });

        // Empty state
        this._emptyState = new Adw.StatusPage({
            icon_name: 'system-search-symbolic',
            title: _('Search for Movies'),
            description: _('Type a movie title above to search TMDB'),
            vexpand: true,
            hexpand: true,
        });

        this._stack.add_named(this._emptyState, 'empty');

        // Loading state
        const loadingBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            spacing: 12,
        });

        const spinner = new Gtk.Spinner({
            spinning: true,
            width_request: 32,
            height_request: 32,
        });

        const loadingLabel = new Gtk.Label({
            label: _('Searching...'),
            css_classes: ['title-3'],
        });

        loadingBox.append(spinner);
        loadingBox.append(loadingLabel);

        this._stack.add_named(loadingBox, 'loading');

        // No results state
        this._noResultsState = new Adw.StatusPage({
            icon_name: 'edit-find-symbolic',
            title: _('No Results Found'),
            description: _('Try different keywords or check the spelling'),
            vexpand: true,
            hexpand: true,
        });

        this._stack.add_named(this._noResultsState, 'no-results');

        // Error state (network/general errors)
        this._errorState = new Adw.StatusPage({
            icon_name: 'network-error-symbolic',
            title: _('Search Failed'),
            description: _('Check your internet connection and try again'),
            vexpand: true,
            hexpand: true,
        });

        const retryButton = new Gtk.Button({
            label: _('Retry'),
            halign: Gtk.Align.CENTER,
            css_classes: ['suggested-action', 'pill'],
        });
        retryButton.connect('clicked', () => {
            this._onSearchChanged();
        });
        this._errorState.set_child(retryButton);

        this._stack.add_named(this._errorState, 'error');

        // API key missing/invalid state
        this._apiKeyState = new Adw.StatusPage({
            icon_name: 'dialog-password-symbolic',
            title: _('API Key Required'),
            description: _('Add your TMDB API key in Preferences to search for movies'),
            vexpand: true,
            hexpand: true,
        });

        const apiKeyButtonBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.CENTER,
            spacing: 12,
        });

        const prefsButton = new Gtk.Button({
            label: _('Open Preferences'),
            css_classes: ['suggested-action', 'pill'],
            action_name: 'app.preferences',
        });

        const apiKeyRetryButton = new Gtk.Button({
            label: _('Retry'),
            css_classes: ['pill'],
        });
        apiKeyRetryButton.connect('clicked', () => {
            this._onSearchChanged();
        });

        apiKeyButtonBox.append(prefsButton);
        apiKeyButtonBox.append(apiKeyRetryButton);
        this._apiKeyState.set_child(apiKeyButtonBox);

        this._stack.add_named(this._apiKeyState, 'api-key');

        // Results view
        const scrolled = new Gtk.ScrolledWindow({
            vexpand: true,
            hexpand: true,
        });

        this._flowBox = new Gtk.FlowBox({
            selection_mode: Gtk.SelectionMode.NONE,
            homogeneous: true,
            column_spacing: 12,
            row_spacing: 12,
            margin_start: 12,
            margin_end: 12,
            margin_top: 12,
            margin_bottom: 18,
            max_children_per_line: 6,
            min_children_per_line: 2,
            activate_on_single_click: true,
        });

        // Handle keyboard activation (Enter/Space on focused item)
        this._flowBox.connect('child-activated', (flowBox, child) => {
            const card = child.get_child();
            if (card && card._movieData) {
                this.emit('movie-selected');
                this._onMovieSelected(card._movieData);
            }
        });

        scrolled.set_child(this._flowBox);
        this._stack.add_named(scrolled, 'results');

        this.append(this._stack);
    }

    async _onSearchChanged() {
        const query = this._searchEntry.get_text().trim();

        if (!query) {
            this._stack.set_visible_child_name('empty');
            return;
        }

        if (!this._tmdbService) {
            this._stack.set_visible_child_name('api-key');
            return;
        }

        // Show loading state
        this._stack.set_visible_child_name('loading');

        try {
            const response = await this._tmdbService.searchMovies(query);

            if (response && response.results && response.results.length > 0) {
                this._displayResults(response.results);
            } else {
                this._stack.set_visible_child_name('no-results');
            }
        } catch (error) {
            logError(error, 'Failed to search movies');

            // Differentiate API key errors from network errors
            const msg = error.message || '';
            if (msg.includes('API key not set') || msg.includes('401')) {
                this._apiKeyState.set_description(
                    msg.includes('401')
                        ? _('Your TMDB API key appears to be invalid')
                        : _('Add your TMDB API key in Preferences to search for movies')
                );
                this._stack.set_visible_child_name('api-key');
            } else {
                this._errorState.set_description(msg || _('An error occurred while searching'));
                this._stack.set_visible_child_name('error');
            }
        }
    }

    _displayResults(movies) {
        // Clear existing cards
        let child = this._flowBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._flowBox.remove(child);
            child = next;
        }

        // Add movie cards
        movies.forEach(movie => {
            const card = new MovieCard(movie, this._imageCache, this._tmdbService);
            card._movieData = movie;
            this._flowBox.append(card);
        });

        this._stack.set_visible_child_name('results');
    }

    _onMovieSelected(movie) {
        // Pass to window via custom event
        if (this.movieSelectedCallback) {
            this.movieSelectedCallback(movie);
        }
    }
});
