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

        this._buildUI();
    }

    _buildUI() {
        // Search entry
        this._searchEntry = new Gtk.SearchEntry({
            placeholder_text: _('Search movies on TMDB'),
            margin_start: 12,
            margin_end: 12,
            margin_top: 12,
            margin_bottom: 6,
        });

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

        this.append(this._searchEntry);

        // Stack for different states
        this._stack = new Gtk.Stack({
            vexpand: true,
            transition_type: Gtk.StackTransitionType.CROSSFADE,
        });

        // Empty state
        this._emptyState = new Adw.StatusPage({
            icon_name: 'system-search-symbolic',
            title: _('Search for Movies'),
            description: _('Find movies from TMDB'),
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
            description: _('Try a different search term'),
            vexpand: true,
            hexpand: true,
        });

        this._stack.add_named(this._noResultsState, 'no-results');

        // Error state
        this._errorState = new Adw.StatusPage({
            icon_name: 'dialog-error-symbolic',
            title: _('Search Failed'),
            description: _('Check your API key and internet connection'),
            vexpand: true,
            hexpand: true,
        });

        this._stack.add_named(this._errorState, 'error');

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
            max_children_per_line: 5,
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
            this._errorState.set_description(_('TMDB service not available'));
            this._stack.set_visible_child_name('error');
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
            this._errorState.set_description(error.message || _('An error occurred while searching'));
            this._stack.set_visible_child_name('error');
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
