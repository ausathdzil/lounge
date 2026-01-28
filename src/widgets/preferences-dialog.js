/* preferences-dialog.js
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

import { TMDBService } from '../services/tmdb.js';

export const PreferencesDialog = GObject.registerClass({
    GTypeName: 'PreferencesDialog',
}, class PreferencesDialog extends Adw.PreferencesDialog {
    constructor(parent) {
        super({
            title: _('Preferences'),
            content_width: 500,
        });

        this._parent = parent;
        this._settings = new Gio.Settings({
            schema_id: 'io.github.ausathdzil.lounge',
        });

        this._buildUI();
    }

    _buildUI() {
        // Create preferences page
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
        });

        // TMDB Integration group
        const tmdbGroup = new Adw.PreferencesGroup({
            title: _('TMDB Integration'),
            description: _('Configure The Movie Database API access'),
        });

        // API Key entry row
        this._apiKeyRow = new Adw.PasswordEntryRow({
            title: _('API Key'),
            show_apply_button: false,
        });

        // Load saved API key
        const savedKey = this._settings.get_string('tmdb-api-key');
        if (savedKey) {
            this._apiKeyRow.set_text(savedKey);
        }

        // Save API key when changed
        this._apiKeyRow.connect('changed', () => {
            const newKey = this._apiKeyRow.get_text();
            this._settings.set_string('tmdb-api-key', newKey);
        });

        tmdbGroup.add(this._apiKeyRow);

        // Horizontal box for button and message
        const buttonBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_top: 12,
            valign: Gtk.Align.START,
        });

        // Test connection button
        this._testButton = new Gtk.Button({
            label: _('Test Connection'),
            css_classes: ['suggested-action'],
            valign: Gtk.Align.CENTER,
        });

        this._testButton.connect('clicked', () => {
            this._testConnection();
        });

        // Status message label
        this._statusLabel = new Gtk.Label({
            label: '',
            wrap: false,
            xalign: 0,
            valign: Gtk.Align.CENTER,
            css_classes: ['body'],
            visible: false,
        });

        buttonBox.append(this._testButton);
        buttonBox.append(this._statusLabel);

        tmdbGroup.add(buttonBox);

        page.add(tmdbGroup);
        this.add(page);
    }

    async _testConnection() {
        const apiKey = this._apiKeyRow.get_text();

        if (!apiKey) {
            this._showMessage(_('Please enter an API key'), 'error');
            return;
        }

        // Hide previous message and disable button
        this._statusLabel.set_visible(false);
        this._testButton.set_sensitive(false);
        this._testButton.set_label(_('Testing...'));

        try {
            const tmdb = new TMDBService(apiKey);
            await tmdb.testConnection();
            
            this._showMessage(_('✓ Connection successful!'), 'success');
            this._testButton.set_label(_('Test Connection'));
        } catch (error) {
            if (error.message.includes('Invalid API key')) {
                this._showMessage(_('✗ Invalid API key'), 'error');
            } else {
                this._showMessage(_('✗ Connection failed: ') + error.message, 'error');
            }
            this._testButton.set_label(_('Test Connection'));
        } finally {
            this._testButton.set_sensitive(true);
        }
    }

    _showMessage(message, type) {
        this._statusLabel.set_label(message);
        this._statusLabel.set_visible(true);

        // Remove previous style classes
        this._statusLabel.remove_css_class('success');
        this._statusLabel.remove_css_class('error');
        this._statusLabel.remove_css_class('warning');

        // Add appropriate style class
        if (type === 'success') {
            this._statusLabel.add_css_class('success');
        } else if (type === 'error') {
            this._statusLabel.add_css_class('error');
        } else if (type === 'warning') {
            this._statusLabel.add_css_class('warning');
        }
    }
});
