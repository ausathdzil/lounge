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
import { WatchlistView } from './views/watchlist-view.js';
import { CollectionsView } from './views/collections-view.js';

export const LoungeWindow = GObject.registerClass({
    GTypeName: 'LoungeWindow',
    Template: 'resource:///io/github/ausathdzil/lounge/window.ui',
    InternalChildren: ['sidebar_list', 'content_stack', 'split_view', 'sidebar_toggle'],
}, class LoungeWindow extends Adw.ApplicationWindow {
    constructor(application) {
        super({ application });

        this._settings = new Gio.Settings({
            schema_id: 'io.github.ausathdzil.lounge',
        });

        // Restore window state
        this._restoreWindowState();

        // Create views
        this._searchView = new SearchView();
        this._logView = new LogView();
        this._watchlistView = new WatchlistView();
        this._collectionsView = new CollectionsView();

        // Add views to stack
        this._content_stack.add_named(this._searchView, 'search');
        this._content_stack.add_named(this._logView, 'log');
        this._content_stack.add_named(this._watchlistView, 'watchlist');
        this._content_stack.add_named(this._collectionsView, 'collections');

        // Set initial view
        this._content_stack.set_visible_child_name('search');

        // Connect sidebar navigation
        this._sidebar_list.connect('row-activated', (listbox, row) => {
            const index = row.get_index();
            const views = ['search', 'log', 'watchlist', 'collections'];
            if (index >= 0 && index < views.length) {
                this._content_stack.set_visible_child_name(views[index]);
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
});
