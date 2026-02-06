/* window.js
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
import Gio from 'gi://Gio';

import { SearchView } from './views/search-view.js';
import { LogView } from './views/log-view.js';

import { MovieDetailsDialog } from './widgets/movie-details-dialog.js';
import { TMDBService } from './services/tmdb.js';

export const LoungeWindow = GObject.registerClass({
    GTypeName: 'LoungeWindow',
    Template: 'resource:///io/github/ausathdzil/lounge/window.ui',
    InternalChildren: ['sidebar_list', 'content_stack', 'split_view', 'sidebar_toggle', 'view_title'],
}, class LoungeWindow extends Adw.ApplicationWindow {
    constructor(application) {
        super({ application });

        this._application = application;

        this._settings = new Gio.Settings({
            schema_id: 'io.github.ausathdzil.lounge',
        });

        // Initialize TMDB service with API key from settings
        const apiKey = this._settings.get_string('tmdb-api-key');
        this._tmdbService = new TMDBService(apiKey);

        // Update TMDB service when API key changes in settings
        this._settings.connect('changed::tmdb-api-key', () => {
            const newKey = this._settings.get_string('tmdb-api-key');
            this._tmdbService.setApiKey(newKey);
        });

        // Restore window state
        this._restoreWindowState();

        // Create views
        this._searchView = new SearchView(application.imageCache, this._tmdbService);
        this._logView = new LogView(application.database, application.imageCache, this._tmdbService);


        // Connect search view movie selection
        this._searchView.movieSelectedCallback = (movie) => {
            this._showMovieDetails(movie);
        };

        // Connect log view entry selection
        this._logView.logEntrySelectedCallback = (logEntry) => {
            this._showMovieDetails(logEntry);
        };

        // Connect log view "Search Movies" CTA
        this._logView.navigateToSearchCallback = () => {
            this._content_stack.set_visible_child_name('search');
            this._view_title.set_label('Search');
            this._sidebar_list.select_row(this._sidebar_list.get_row_at_index(0));
        };

        // Add views to stack
        this._content_stack.add_named(this._searchView, 'search');
        this._content_stack.add_named(this._logView, 'log');


        // Set initial view
        this._content_stack.set_visible_child_name('search');

        // Connect sidebar navigation
        this._sidebar_list.connect('row-activated', (listbox, row) => {
            const index = row.get_index();
            const views = ['search', 'log'];
            const titles = ['Search', 'Log'];
            if (index >= 0 && index < views.length) {
                this._content_stack.set_visible_child_name(views[index]);
                this._view_title.set_label(titles[index]);
                
                // Refresh log view when navigating to it
                if (views[index] === 'log') {
                    this._logView.refresh();
                }
            }
        });

        // Select first row by default
        this._sidebar_list.select_row(this._sidebar_list.get_row_at_index(0));

        // Bind toggle button to split view
        this._sidebar_toggle.bind_property(
            'active',
            this._split_view,
            'show-sidebar',
            GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE
        );

        // Save window state on close
        this.connect('close-request', () => {
            this._saveWindowState();
            return false;
        });
    }

    _restoreWindowState() {
        const width = this._settings.get_int('window-width');
        const height = this._settings.get_int('window-height');
        const maximized = this._settings.get_boolean('window-maximized');

        this.set_default_size(width, height);

        if (maximized) {
            this.maximize();
        }
    }

    _saveWindowState() {
        const [width, height] = this.get_default_size();
        
        this._settings.set_int('window-width', width);
        this._settings.set_int('window-height', height);
        this._settings.set_boolean('window-maximized', this.is_maximized());
    }

    _showMovieDetails(movie) {
        const dialog = new MovieDetailsDialog(movie, this._application.database, this._tmdbService);
        
        // Refresh log view when log changes
        dialog.connect('log-changed', () => {
            this._logView.refresh();
        });
        
        dialog.present(this);
    }
});
