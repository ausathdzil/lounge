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
import Gdk from 'gi://Gdk';
import Pango from 'gi://Pango';

import { CARD_WIDTH, POSTER_HEIGHT, MAX_RATING, TMDB_POSTER_SIZE } from '../utils/constants.js';

export const LogEntryCard = GObject.registerClass({
    GTypeName: 'LogEntryCard',
}, class LogEntryCard extends Gtk.Box {
    constructor(logEntry, imageCache, tmdbService) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            css_classes: ['card'],
            width_request: CARD_WIDTH,
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
            height_request: POSTER_HEIGHT,
            css_classes: ['poster-placeholder'],
        });
        
        // Poster image or placeholder
        this._posterImage = new Gtk.Picture({
            can_shrink: false,
            content_fit: Gtk.ContentFit.COVER,
            vexpand: true,
            hexpand: true,
            alternative_text: `Poster for ${this._logEntry.title}`,
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
            tooltip_text: `Your rating: ${this._logEntry.user_rating}/${MAX_RATING}`,
        });

        overlay.add_overlay(ratingBadge);
        this.append(overlay);

        // Info section
        const infoBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 8,
            margin_end: 8,
            margin_top: 8,
            margin_bottom: 8,
        });

        // Title
        const titleLabel = new Gtk.Label({
            label: this._logEntry.title,
            wrap: true,
            max_width_chars: 20,
            xalign: 0,
            lines: 2,
            ellipsize: Pango.EllipsizeMode.END,
            css_classes: ['title-4'],
        });
        infoBox.append(titleLabel);

        // Year and watched date on one line
        const metaLabel = new Gtk.Label({
            label: this._logEntry.year
                ? `${this._logEntry.year} \u2022 ${this._formatDate(this._logEntry.watched_date)}`
                : this._formatDate(this._logEntry.watched_date),
            xalign: 0,
            ellipsize: Pango.EllipsizeMode.END,
            css_classes: ['caption', 'dim-label'],
        });
        infoBox.append(metaLabel);
        this.append(infoBox);
    }

    async _loadPoster() {
        try {
            const pixbuf = await this._imageCache.getPosterPixbuf(
                this._logEntry.movie_id,
                this._logEntry.poster_path,
                this._tmdbService,
                TMDB_POSTER_SIZE
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
        return `${Math.round(rating)}/${MAX_RATING}`;
    }

    _formatDate(dateString) {
        // Format: YYYY-MM-DD -> MMM DD, YYYY
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
});
