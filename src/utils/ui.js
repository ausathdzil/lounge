/* ui.js
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

import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import { POSTER_HEIGHT_CARD, POSTER_ASPECT_RATIO, TMDB_POSTER_SIZE } from './constants.js';

/**
 * Removes all children from a GTK container widget.
 *
 * @param {Gtk.Widget} container - The container to clear
 */
export function removeAllChildren(container) {
    let child = container.get_first_child();
    while (child) {
        const next = child.get_next_sibling();
        container.remove(child);
        child = next;
    }
}

/**
 * Loads a poster image into a container, replacing any existing children.
 * Fetches the poster from cache/network, scales it to the target height,
 * and displays it as a Gtk.Picture.
 *
 * @param {Object} options
 * @param {Gtk.Box} options.container - The container to display the poster in
 * @param {number} options.movieId - TMDB movie ID
 * @param {string} options.posterPath - TMDB poster path
 * @param {string} options.title - Movie title (for alt text)
 * @param {ImageCacheService} options.imageCache - Image cache service
 * @param {TMDBService} options.tmdbService - TMDB service
 * @param {number} [options.targetHeight=300] - Target height in pixels
 * @param {string} [options.posterSize='w342'] - TMDB poster size
 */
export async function loadPosterIntoContainer({
    container,
    movieId,
    posterPath,
    title,
    imageCache,
    tmdbService,
    targetHeight = POSTER_HEIGHT_CARD,
    posterSize = TMDB_POSTER_SIZE,
}) {
    const texture = await imageCache.getPosterPixbuf(
        movieId,
        posterPath,
        tmdbService,
        posterSize,
    );

    if (!texture) return;

    removeAllChildren(container);

    const targetWidth = Math.round(targetHeight * POSTER_ASPECT_RATIO);

    container.height_request = targetHeight;
    container.width_request = targetWidth;

    const picture = new Gtk.Picture({
        paintable: texture,
        content_fit: Gtk.ContentFit.COVER,
        halign: Gtk.Align.FILL,
        valign: Gtk.Align.FILL,
        hexpand: true,
        vexpand: true,
        can_shrink: false,
        width_request: targetWidth,
        height_request: targetHeight,
        alternative_text: `Poster for ${title}`,
    });

    container.append(picture);
}
