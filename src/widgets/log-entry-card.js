/* log-entry-card.js
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
import Gdk from 'gi://Gdk';

export const LogEntryCard = GObject.registerClass({
    GTypeName: 'LogEntryCard',
    Signals: {
        'activated': {
            param_types: [GObject.TYPE_JSOBJECT],
        },
    },
}, class LogEntryCard extends Gtk.Box {
    constructor(logEntry, imageCache, tmdbService) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            css_classes: ['card'],
            width_request: 150,
            overflow: Gtk.Overflow.HIDDEN,
        });

        this._logEntry = logEntry;
        this._imageCache = imageCache;
        this._tmdbService = tmdbService;

        this._buildUI();
    }

    _buildUI() {
        // Poster container with overlay
        const overlay = new Gtk.Overlay();
        
        // Poster box for sizing
        const posterBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            height_request: 225,
            css_classes: ['poster-placeholder'],
        });
        
        // Poster image or placeholder
        this._posterImage = new Gtk.Picture({
            can_shrink: false,
            content_fit: Gtk.ContentFit.COVER,
            vexpand: true,
            hexpand: true,
        });

        if (this._logEntry.poster_path) {
            this._loadPoster();
        }

        posterBox.append(this._posterImage);
        overlay.set_child(posterBox);

        // Rating badge overlay
        const ratingBadge = new Gtk.Label({
            label: this._formatRating(this._logEntry.user_rating),
            halign: Gtk.Align.START,
            valign: Gtk.Align.START,
            margin_start: 8,
            margin_top: 8,
            css_classes: ['accent', 'badge'],
            tooltip_text: `Your rating: ${this._logEntry.user_rating}/5`,
        });

        // Style the badge with custom CSS
        const cssProvider = new Gtk.CssProvider();
        cssProvider.load_from_string(`
            .badge {
                background-color: @accent_bg_color;
                color: @accent_fg_color;
                padding: 4px 8px;
                border-radius: 6px;
                font-weight: bold;
                font-size: 0.9em;
            }
        `);

        overlay.add_overlay(ratingBadge);
        this.append(overlay);

        // Info section
        const infoBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            margin_start: 12,
            margin_end: 12,
            margin_top: 12,
            margin_bottom: 12,
        });

        // Title
        const titleLabel = new Gtk.Label({
            label: this._logEntry.title,
            wrap: true,
            max_width_chars: 20,
            xalign: 0,
            lines: 2,
            ellipsize: 3, // PANGO_ELLIPSIZE_END
            css_classes: ['heading'],
        });
        infoBox.append(titleLabel);

        // Year and date
        const metaBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
        });

        const yearLabel = new Gtk.Label({
            label: this._logEntry.year ? this._logEntry.year.toString() : '',
            xalign: 0,
            css_classes: ['caption', 'dim-label'],
        });
        metaBox.append(yearLabel);

        const dateLabel = new Gtk.Label({
            label: `Watched: ${this._formatDate(this._logEntry.watched_date)}`,
            xalign: 0,
            css_classes: ['caption', 'dim-label'],
        });
        metaBox.append(dateLabel);

        infoBox.append(metaBox);
        this.append(infoBox);

        // Make card clickable
        const gestureClick = new Gtk.GestureClick();
        gestureClick.connect('released', () => {
            this.emit('activated', this._logEntry);
        });
        this.add_controller(gestureClick);
    }

    async _loadPoster() {
        try {
            const pixbuf = await this._imageCache.getPosterPixbuf(
                this._logEntry.movie_id,
                this._logEntry.poster_path,
                this._tmdbService,
                'w342'
            );
            
            if (pixbuf) {
                const texture = Gdk.Texture.new_for_pixbuf(pixbuf);
                this._posterImage.set_paintable(texture);
            }
        } catch (error) {
            console.error('Failed to load poster:', error);
        }
    }

    _formatRating(rating) {
        return '★'.repeat(Math.round(rating));
    }

    _formatDate(dateString) {
        // Format: YYYY-MM-DD -> MMM DD, YYYY
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
});
