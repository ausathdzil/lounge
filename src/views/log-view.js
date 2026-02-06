/* log-view.js
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
import GLib from 'gi://GLib';
import { LogEntryCard } from '../widgets/log-entry-card.js';
import { removeAllChildren } from '../utils/ui.js';

export const LogView = GObject.registerClass({
    GTypeName: 'LogView',
}, class LogView extends Gtk.Box {
    constructor(database, imageCache, tmdbService) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: true,
            vexpand: true,
        });

        this._database = database;
        this._imageCache = imageCache;
        this._tmdbService = tmdbService;
        this._logEntries = [];

        // Callback for when a log entry is clicked
        this.logEntrySelectedCallback = null;

        // Callback for navigating to search view
        this.navigateToSearchCallback = null;

        this._buildUI();
    }

    _buildUI() {
        // Toolbar with filters
        const toolbar = new Adw.HeaderBar({
            show_title: false,
            show_start_title_buttons: false,
            show_end_title_buttons: false,
        });

        // Sort button (left side)
        const sortMenu = new Gio.Menu();
        sortMenu.append(_('Recently Watched'), 'log.sort::date_desc');
        sortMenu.append(_('Oldest First'), 'log.sort::date_asc');
        sortMenu.append(_('Highest Rated'), 'log.sort::rating_desc');
        sortMenu.append(_('Lowest Rated'), 'log.sort::rating_asc');
        sortMenu.append(_('Title (A-Z)'), 'log.sort::title_asc');
        sortMenu.append(_('Title (Z-A)'), 'log.sort::title_desc');

        const sortButton = new Gtk.MenuButton({
            icon_name: 'view-sort-ascending-symbolic',
            menu_model: sortMenu,
            tooltip_text: _('Sort'),
        });
        toolbar.pack_start(sortButton);

        // Refresh button (right side)
        const refreshButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            tooltip_text: _('Refresh'),
        });
        refreshButton.connect('clicked', () => this.refresh());
        toolbar.pack_end(refreshButton);

        this.append(toolbar);

        // Stack for different states
        this._stack = new Gtk.Stack({
            vexpand: true,
            hexpand: true,
        });

        // Empty state
        this._emptyState = new Adw.StatusPage({
            icon_name: 'video-x-generic-symbolic',
            title: _('No Movies Logged'),
            description: _('Search for movies and log the ones you\'ve watched'),
            vexpand: true,
            hexpand: true,
        });

        const searchButton = new Gtk.Button({
            label: _('Search Movies'),
            halign: Gtk.Align.CENTER,
            css_classes: ['suggested-action', 'pill'],
        });
        searchButton.connect('clicked', () => {
            if (this.navigateToSearchCallback) {
                this.navigateToSearchCallback();
            }
        });
        this._emptyState.set_child(searchButton);
        this._stack.add_named(this._emptyState, 'empty');

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
            valign: Gtk.Align.START,
            max_children_per_line: 6,
            min_children_per_line: 2,
            activate_on_single_click: true,
        });

        // Handle activation (click or keyboard Enter/Space)
        this._flowBox.connect('child-activated', (flowBox, child) => {
            const card = child.get_child();
            if (card && card._logEntry && this.logEntrySelectedCallback) {
                this.logEntrySelectedCallback(card._logEntry);
            }
        });

        scrolled.set_child(this._flowBox);
        this._stack.add_named(scrolled, 'results');

        this.append(this._stack);

        // Set initial state
        this._stack.set_visible_child_name('empty');

        // Set up sort actions
        this._setupSortActions();
    }

    _setupSortActions() {
        const actionGroup = new Gio.SimpleActionGroup();
        
        const sortAction = new Gio.SimpleAction({
            name: 'sort',
            parameter_type: new GLib.VariantType('s'),
        });

        sortAction.connect('activate', (_, parameter) => {
            const sortType = parameter.unpack();
            this._applySorting(sortType);
        });

        actionGroup.add_action(sortAction);
        this.insert_action_group('log', actionGroup);
    }

    _applySorting(sortType) {
        const [field, order] = sortType.split('_');
        
        // Map UI sort options to database fields
        let sortField = 'watched_date';
        let sortOrder = 'DESC';

        if (field === 'date') {
            sortField = 'watched_date';
            sortOrder = order === 'desc' ? 'DESC' : 'ASC';
        } else if (field === 'rating') {
            sortField = 'rating';
            sortOrder = order === 'desc' ? 'DESC' : 'ASC';
        } else if (field === 'title') {
            sortField = 'title';
            sortOrder = order === 'desc' ? 'DESC' : 'ASC';
        }

        this.refresh({ sortBy: sortField, sortOrder: sortOrder });
    }

    async refresh(filters = {}) {
        try {
            // Default sort: recently watched
            const sortBy = filters.sortBy || 'watched_date';
            const sortOrder = filters.sortOrder || 'DESC';

            this._logEntries = await this._database.getMovieLogs({
                sortBy: sortBy,
                sortOrder: sortOrder,
            });

            this._displayLogs();
        } catch (error) {
            console.error('Failed to load movie logs:', error);
        }
    }

    _displayLogs() {
        removeAllChildren(this._flowBox);

        if (this._logEntries.length === 0) {
            this._stack.set_visible_child_name('empty');
            return;
        }

        // Add log entry cards
        this._logEntries.forEach(logEntry => {
            const card = new LogEntryCard(logEntry, this._imageCache, this._tmdbService);
            this._flowBox.append(card);
        });

        this._stack.set_visible_child_name('results');
    }
});
