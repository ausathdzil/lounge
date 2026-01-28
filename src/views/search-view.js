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

import { MOCK_MOVIES } from '../utils/mock-data.js';
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
        
        console.log('SearchView initialized with:', {
            hasImageCache: !!imageCache,
            hasTmdbService: !!tmdbService
        });

        this._buildUI();
        this._showResults();
    }

    _buildUI() {
        // Search entry
        const searchEntry = new Gtk.SearchEntry({
            placeholder_text: _('Search movies (Phase 3)'),
            margin_start: 12,
            margin_end: 12,
            margin_top: 12,
            margin_bottom: 6,
            // Note: Search functionality will be implemented in Phase 3
            // For now, it's enabled for testing focus behavior
        });

        this.append(searchEntry);

        // Stack for different states
        this._stack = new Gtk.Stack({
            vexpand: true,
            transition_type: Gtk.StackTransitionType.CROSSFADE,
        });

        // Empty state
        const emptyState = new Adw.StatusPage({
            icon_name: 'system-search-symbolic',
            title: _('Search for Movies'),
            description: _('Find movies from TMDB'),
            vexpand: true,
            hexpand: true,
        });

        this._stack.add_named(emptyState, 'empty');

        // Results view
        const scrolled = new Gtk.ScrolledWindow({
            vexpand: true,
            hexpand: true,
        });

        this._flowBox = new Gtk.FlowBox({
            selection_mode: Gtk.SelectionMode.NONE,
            homogeneous: true,
            column_spacing: 18,
            row_spacing: 18,
            margin_start: 18,
            margin_end: 18,
            margin_top: 12,
            margin_bottom: 18,
            max_children_per_line: 5,
            min_children_per_line: 2,
            activate_on_single_click: true, // Enable click and keyboard activation
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

    _showResults() {
        // Clear existing cards
        let child = this._flowBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._flowBox.remove(child);
            child = next;
        }

        // Add movie cards
        MOCK_MOVIES.forEach(movie => {
            const card = new MovieCard(movie, this._imageCache, this._tmdbService);
            card._movieData = movie; // Store movie data
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
