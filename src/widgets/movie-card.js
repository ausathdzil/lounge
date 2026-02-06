/* movie-card.js
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
import Adw from 'gi://Adw';

export const MovieCard = GObject.registerClass({
    GTypeName: 'MovieCard',
    Properties: {
        'movie-id': GObject.ParamSpec.int(
            'movie-id',
            'Movie ID',
            'The movie ID',
            GObject.ParamFlags.READWRITE,
            0, 2147483647, 0
        ),
        'title': GObject.ParamSpec.string(
            'title',
            'Title',
            'The movie title',
            GObject.ParamFlags.READWRITE,
            ''
        ),
        'year': GObject.ParamSpec.int(
            'year',
            'Year',
            'The movie year',
            GObject.ParamFlags.READWRITE,
            0, 2147483647, 0
        ),
    },
}, class MovieCard extends Gtk.Box {
    constructor(movie, imageCache = null, tmdbService = null) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0,
            css_classes: ['card'],
            width_request: 150,
            overflow: Gtk.Overflow.HIDDEN,
        });

        this._imageCache = imageCache;
        this._tmdbService = tmdbService;
        this._movie = movie;

        if (movie) {
            this.movie_id = movie.id;
            this.title = movie.title;
            this.year = movie.year;
        }

        this._buildUI();
    }

    _buildUI() {
        // Poster container
        this._posterBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.FILL,
            hexpand: true,
            vexpand: false,
            height_request: 300,
            css_classes: ['poster-placeholder'],
        });

        // Show placeholder initially
        this._showPlaceholder();

        this.append(this._posterBox);

        // Load real image if services are available
        if (this._imageCache && this._tmdbService && this._movie && this._movie.poster_path) {
            this._loadPosterImage();
        }

        // Text content with padding
        const textBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 8,
            margin_end: 8,
            margin_top: 8,
            margin_bottom: 8,
        });

        // Title
        const titleLabel = new Gtk.Label({
            label: this.title || 'Unknown',
            wrap: true,
            wrap_mode: 2, // WORD_CHAR
            max_width_chars: 18,
            lines: 2,
            ellipsize: 3, // END
            xalign: 0,
            css_classes: ['title-4'],
        });

        textBox.append(titleLabel);

        // Year
        const yearLabel = new Gtk.Label({
            label: this.year ? this.year.toString() : '',
            xalign: 0,
            css_classes: ['dim-label', 'caption'],
        });

        textBox.append(yearLabel);
        this.append(textBox);
    }

    _showPlaceholder() {
        // Clear existing content
        let child = this._posterBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._posterBox.remove(child);
            child = next;
        }

        const icon = new Gtk.Image({
            icon_name: 'video-x-generic-symbolic',
            pixel_size: 64,
            opacity: 0.5,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            vexpand: true,
            accessible_role: Gtk.AccessibleRole.PRESENTATION,
        });

        this._posterBox.append(icon);
    }

    async _loadPosterImage() {
        try {
            const pixbuf = await this._imageCache.getPosterPixbuf(
                this._movie.id,
                this._movie.poster_path,
                this._tmdbService,
                'w342'
            );

            if (pixbuf) {
                // Clear placeholder
                let child = this._posterBox.get_first_child();
                while (child) {
                    const next = child.get_next_sibling();
                    this._posterBox.remove(child);
                    child = next;
                }

                // Scale pixbuf to fit container while maintaining aspect ratio
                const targetHeight = 300;
                
                const originalWidth = pixbuf.get_width();
                const originalHeight = pixbuf.get_height();
                
                // Calculate scale based on height to cover the container
                const scale = targetHeight / originalHeight;
                
                const scaledWidth = Math.round(originalWidth * scale);
                const scaledHeight = Math.round(originalHeight * scale);
                
                // Scale the pixbuf
                const scaledPixbuf = pixbuf.scale_simple(
                    scaledWidth,
                    scaledHeight,
                    2 // GdkPixbuf.InterpType.BILINEAR
                );

                // Create texture from scaled pixbuf
                const texture = Gdk.Texture.new_for_pixbuf(scaledPixbuf);

                // Create picture widget
                const picture = new Gtk.Picture({
                    paintable: texture,
                    content_fit: Gtk.ContentFit.COVER,
                    halign: Gtk.Align.FILL,
                    valign: Gtk.Align.FILL,
                    hexpand: true,
                    vexpand: true,
                    height_request: 300,
                    alternative_text: `Poster for ${this.title || 'Unknown'}`,
                });

                this._posterBox.append(picture);
            }
        } catch (error) {
            logError(error, `Failed to load poster for movie ${this._movie.id}`);
            // Keep placeholder on error
        }
    }
});
