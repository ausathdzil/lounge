/* movie-details-dialog.js
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

export const MovieDetailsDialog = GObject.registerClass({
    GTypeName: 'MovieDetailsDialog',
}, class MovieDetailsDialog extends Adw.Dialog {
    constructor(movie, parent) {
        super({
            title: movie.title,
            content_width: 600,
            content_height: 500,
            can_close: true,
        });

        this._movie = movie;
        this._buildUI();
    }

    _buildUI() {
        const toolbarView = new Adw.ToolbarView();

        const headerBar = new Adw.HeaderBar({
            show_title: false,
        });
        toolbarView.add_top_bar(headerBar);

        const scrolled = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vexpand: true,
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 18,
            margin_start: 24,
            margin_end: 24,
            margin_top: 24,
            margin_bottom: 24,
        });

        // Header section with poster and basic info
        const headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 18,
        });

        // Poster placeholder
        const posterBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.START,
            halign: Gtk.Align.CENTER,
            width_request: 200,
            height_request: 300,
            css_classes: ['poster-placeholder', 'card'],
        });

        const posterIcon = new Gtk.Image({
            icon_name: 'video-x-generic-symbolic',
            pixel_size: 96,
            opacity: 0.5,
        });

        posterBox.append(posterIcon);
        headerBox.append(posterBox);

        // Info section
        const infoBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            hexpand: true,
        });

        // Title and year
        const titleBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
        });

        const titleLabel = new Gtk.Label({
            label: this._movie.title,
            wrap: true,
            xalign: 0,
            css_classes: ['title-1'],
        });
        titleBox.append(titleLabel);

        const yearLabel = new Gtk.Label({
            label: `(${this._movie.year})`,
            css_classes: ['title-2', 'dim-label'],
        });
        titleBox.append(yearLabel);

        infoBox.append(titleBox);

        // Rating
        const ratingBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
        });

        const starIcon = new Gtk.Image({
            icon_name: 'starred-symbolic',
            pixel_size: 16,
        });
        ratingBox.append(starIcon);

        const ratingLabel = new Gtk.Label({
            label: `${this._movie.tmdb_rating}/10`,
            css_classes: ['title-3'],
        });
        ratingBox.append(ratingLabel);

        infoBox.append(ratingBox);

        // Runtime and genres
        const metaLabel = new Gtk.Label({
            label: `${this._formatRuntime(this._movie.runtime)} • ${this._movie.genres}`,
            wrap: true,
            xalign: 0,
            css_classes: ['dim-label'],
        });
        infoBox.append(metaLabel);

        // Director
        const directorLabel = new Gtk.Label({
            label: `Director: ${this._movie.director}`,
            wrap: true,
            xalign: 0,
        });
        infoBox.append(directorLabel);

        headerBox.append(infoBox);
        box.append(headerBox);

        // Overview section
        const overviewHeading = new Gtk.Label({
            label: _('Overview'),
            xalign: 0,
            css_classes: ['title-4'],
        });
        box.append(overviewHeading);

        const overviewLabel = new Gtk.Label({
            label: this._movie.overview,
            wrap: true,
            xalign: 0,
            selectable: true,
        });
        box.append(overviewLabel);

        // Placeholder for future actions
        const actionsLabel = new Gtk.Label({
            label: _('Actions will be available in Phase 4'),
            css_classes: ['dim-label', 'caption'],
            xalign: 0,
            margin_top: 12,
        });
        box.append(actionsLabel);

        scrolled.set_child(box);
        toolbarView.set_content(scrolled);
        this.set_child(toolbarView);
    }

    _formatRuntime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    }
});
