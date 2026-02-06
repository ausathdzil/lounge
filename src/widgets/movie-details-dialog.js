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
import Gdk from 'gi://Gdk';
import Adw from 'gi://Adw';
import { LogEntryDialog } from './log-entry-dialog.js';

export const MovieDetailsDialog = GObject.registerClass({
    GTypeName: 'MovieDetailsDialog',
    Signals: {
        'log-changed': {},
    },
}, class MovieDetailsDialog extends Adw.Dialog {
    constructor(movie, database, tmdbService = null, imageCache = null) {
        super({
            title: movie.title,
            content_width: 500,
            content_height: 600,
            can_close: true,
        });

        // Normalize the movie object (handle both search results and log entries)
        this._movie = {
            id: movie.id || movie.movie_id,
            title: movie.title,
            year: movie.year,
            poster_path: movie.poster_path,
            backdrop_path: movie.backdrop_path,
            overview: movie.overview,
            runtime: movie.runtime,
            genres: movie.genres,
            director: movie.director,
            tmdb_rating: movie.tmdb_rating,
            original_title: movie.original_title,
        };

        this._database = database;
        this._tmdbService = tmdbService;
        this._imageCache = imageCache;
        this._logEntry = null;

        this._buildUI();
        this._loadData();
    }

    _buildUI() {
        const toolbarView = new Adw.ToolbarView();

        const headerBar = new Adw.HeaderBar({
            show_title: false,
        });
        toolbarView.add_top_bar(headerBar);

        // Stack for loading/content/error states
        this._stack = new Gtk.Stack({
            vexpand: true,
            transition_type: Gtk.StackTransitionType.CROSSFADE,
        });

        // Loading state
        const loadingBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            spacing: 12,
        });
        const spinner = new Gtk.Spinner({
            spinning: true,
            width_request: 32,
            height_request: 32,
        });
        const loadingLabel = new Gtk.Label({
            label: _('Loading details...'),
            css_classes: ['title-3'],
        });
        loadingBox.append(spinner);
        loadingBox.append(loadingLabel);
        this._stack.add_named(loadingBox, 'loading');

        // Error state
        this._errorState = new Adw.StatusPage({
            icon_name: 'network-error-symbolic',
            title: _('Failed to Load Details'),
            description: _('Check your internet connection and try again'),
        });
        const retryButton = new Gtk.Button({
            label: _('Retry'),
            halign: Gtk.Align.CENTER,
            css_classes: ['suggested-action', 'pill'],
        });
        retryButton.connect('clicked', () => this._loadData());
        this._errorState.set_child(retryButton);
        this._stack.add_named(this._errorState, 'error');

        // Content
        this._contentBox = this._buildContent();
        this._stack.add_named(this._contentBox, 'content');

        toolbarView.set_content(this._stack);
        this.set_child(toolbarView);

        // Show loading if we need to fetch details, otherwise show content directly
        const needsFetch = !this._movie.runtime && !this._movie.genres && !this._movie.director;
        this._stack.set_visible_child_name(needsFetch ? 'loading' : 'content');
    }

    _buildContent() {
        const scrolled = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vexpand: true,
        });

        const clamp = new Adw.Clamp({
            maximum_size: 500,
            margin_start: 24,
            margin_end: 24,
            margin_top: 12,
            margin_bottom: 24,
        });

        const mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 24,
        });

        // --- Poster ---
        this._posterBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER,
            width_request: 200,
            height_request: 300,
            overflow: Gtk.Overflow.HIDDEN,
            css_classes: ['card'],
        });

        // Placeholder
        const posterPlaceholder = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.FILL,
            valign: Gtk.Align.FILL,
            hexpand: true,
            vexpand: true,
            css_classes: ['poster-placeholder'],
        });
        const posterIcon = new Gtk.Image({
            icon_name: 'video-x-generic-symbolic',
            pixel_size: 64,
            opacity: 0.5,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            vexpand: true,
            accessible_role: Gtk.AccessibleRole.PRESENTATION,
        });
        posterPlaceholder.append(posterIcon);
        this._posterBox.append(posterPlaceholder);

        mainBox.append(this._posterBox);

        // Load poster image
        if (this._imageCache && this._tmdbService && this._movie.poster_path) {
            this._loadPosterImage();
        }

        // --- Title + Year ---
        const titleBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
        });

        const titleLabel = new Gtk.Label({
            label: this._movie.title,
            wrap: true,
            xalign: 0.5,
            justify: Gtk.Justification.CENTER,
            css_classes: ['title-1'],
        });
        titleBox.append(titleLabel);

        if (this._movie.year) {
            const subtitleLabel = new Gtk.Label({
                label: this._movie.year.toString(),
                xalign: 0.5,
                css_classes: ['dim-label', 'title-4'],
            });
            titleBox.append(subtitleLabel);
        }

        mainBox.append(titleBox);

        // --- Log button (placed early so user doesn't have to scroll) ---
        this._logButton = new Gtk.Button({
            css_classes: ['suggested-action', 'pill'],
            halign: Gtk.Align.CENTER,
            tooltip_text: _('Log this movie to your diary'),
        });

        this._logButtonContent = new Adw.ButtonContent({
            icon_name: 'list-add-symbolic',
            label: _('Log Movie'),
        });
        this._logButton.set_child(this._logButtonContent);
        this._logButton.connect('clicked', () => this._openLogDialog());

        mainBox.append(this._logButton);

        // --- Details group ---
        this._detailsGroup = new Adw.PreferencesGroup();

        // TMDB Rating row
        if (this._movie.tmdb_rating) {
            const ratingRow = new Adw.ActionRow({
                title: _('TMDB Rating'),
            });
            ratingRow.add_prefix(new Gtk.Image({
                icon_name: 'starred-symbolic',
                accessible_role: Gtk.AccessibleRole.PRESENTATION,
            }));
            ratingRow.add_suffix(new Gtk.Label({
                label: `${this._movie.tmdb_rating}/10`,
                css_classes: ['dim-label'],
                valign: Gtk.Align.CENTER,
            }));
            this._detailsGroup.add(ratingRow);
        }

        // Runtime row (updated later if fetched)
        this._runtimeRow = new Adw.ActionRow({
            title: _('Runtime'),
            visible: false,
        });
        this._runtimeRow.add_prefix(new Gtk.Image({
            icon_name: 'preferences-system-time-symbolic',
            accessible_role: Gtk.AccessibleRole.PRESENTATION,
        }));
        this._runtimeSuffix = new Gtk.Label({
            css_classes: ['dim-label'],
            valign: Gtk.Align.CENTER,
        });
        this._runtimeRow.add_suffix(this._runtimeSuffix);
        this._detailsGroup.add(this._runtimeRow);

        // Genres row (updated later if fetched)
        this._genresRow = new Adw.ActionRow({
            title: _('Genres'),
            visible: false,
        });
        this._genresRow.add_prefix(new Gtk.Image({
            icon_name: 'bookmark-new-symbolic',
            accessible_role: Gtk.AccessibleRole.PRESENTATION,
        }));
        this._genresSuffix = new Gtk.Label({
            css_classes: ['dim-label'],
            valign: Gtk.Align.CENTER,
            wrap: true,
            xalign: 1,
            max_width_chars: 30,
        });
        this._genresRow.add_suffix(this._genresSuffix);
        this._detailsGroup.add(this._genresRow);

        // Director row (updated later if fetched)
        this._directorRow = new Adw.ActionRow({
            title: _('Director'),
            visible: false,
        });
        this._directorRow.add_prefix(new Gtk.Image({
            icon_name: 'avatar-default-symbolic',
            accessible_role: Gtk.AccessibleRole.PRESENTATION,
        }));
        this._directorSuffix = new Gtk.Label({
            css_classes: ['dim-label'],
            valign: Gtk.Align.CENTER,
        });
        this._directorRow.add_suffix(this._directorSuffix);
        this._detailsGroup.add(this._directorRow);

        mainBox.append(this._detailsGroup);

        // Update meta fields if data is already available
        this._updateMetaFields();

        // --- Overview group ---
        this._overviewGroup = new Adw.PreferencesGroup({
            title: _('Overview'),
        });

        this._overviewLabel = new Gtk.Label({
            label: this._movie.overview || _('No overview available'),
            wrap: true,
            xalign: 0,
            selectable: true,
        });
        this._overviewGroup.add(this._overviewLabel);

        mainBox.append(this._overviewGroup);

        clamp.set_child(mainBox);
        scrolled.set_child(clamp);
        return scrolled;
    }

    _updateMetaFields() {
        if (this._movie.runtime) {
            this._runtimeSuffix.label = this._formatRuntime(this._movie.runtime);
            this._runtimeRow.visible = true;
        }

        if (this._movie.genres) {
            this._genresSuffix.label = this._movie.genres;
            this._genresRow.visible = true;
        }

        if (this._movie.director) {
            this._directorSuffix.label = this._movie.director;
            this._directorRow.visible = true;
        }

        if (this._movie.overview && this._overviewLabel) {
            this._overviewLabel.label = this._movie.overview;
        }
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

                const targetHeight = 300;
                const originalWidth = pixbuf.get_width();
                const originalHeight = pixbuf.get_height();
                const scale = targetHeight / originalHeight;
                const scaledWidth = Math.round(originalWidth * scale);
                const scaledHeight = Math.round(originalHeight * scale);

                const scaledPixbuf = pixbuf.scale_simple(
                    scaledWidth,
                    scaledHeight,
                    2 // GdkPixbuf.InterpType.BILINEAR
                );

                const texture = Gdk.Texture.new_for_pixbuf(scaledPixbuf);

                const picture = new Gtk.Picture({
                    paintable: texture,
                    content_fit: Gtk.ContentFit.COVER,
                    halign: Gtk.Align.FILL,
                    valign: Gtk.Align.FILL,
                    hexpand: true,
                    vexpand: true,
                    height_request: 300,
                    alternative_text: `Poster for ${this._movie.title}`,
                });

                this._posterBox.append(picture);
            }
        } catch (error) {
            logError(error, `Failed to load poster for movie ${this._movie.id}`);
        }
    }

    async _loadData() {
        // Fetch full details from TMDB if missing
        const needsFetch = !this._movie.runtime && !this._movie.genres && !this._movie.director;

        if (needsFetch && this._tmdbService) {
            this._stack.set_visible_child_name('loading');
            try {
                const details = await this._tmdbService.getMovieDetails(this._movie.id);
                // Merge fetched details into movie object
                this._movie.runtime = details.runtime || this._movie.runtime;
                this._movie.genres = details.genres || this._movie.genres;
                this._movie.director = details.director || this._movie.director;
                this._movie.overview = details.overview || this._movie.overview;
                this._movie.tmdb_rating = details.tmdb_rating || this._movie.tmdb_rating;

                this._updateMetaFields();
                this._stack.set_visible_child_name('content');
            } catch (error) {
                console.error('Failed to fetch movie details:', error);
                this._errorState.set_description(error.message || _('Could not load movie details'));
                this._stack.set_visible_child_name('error');
                return;
            }
        }

        // Load log entry from database
        try {
            this._logEntry = await this._database.getLogEntry(this._movie.id);
            this._updateLogStatus();
        } catch (error) {
            console.error('Failed to load log entry:', error);
        }
    }

    _updateLogStatus() {
        if (this._logEntry) {
            this._logButtonContent.label = `${this._logEntry.user_rating}/5 \u2022 ${this._logEntry.watched_date}`;
            this._logButtonContent.icon_name = 'document-edit-symbolic';
            this._logButton.css_classes = ['pill'];
            this._logButton.tooltip_text = _('Edit your log entry');
        } else {
            this._logButtonContent.label = _('Log Movie');
            this._logButtonContent.icon_name = 'list-add-symbolic';
            this._logButton.css_classes = ['suggested-action', 'pill'];
            this._logButton.tooltip_text = _('Log this movie to your diary');
        }
    }

    _openLogDialog() {
        const logDialog = new LogEntryDialog(this._movie, this._logEntry);

        logDialog.connect('saved', async (_, data) => {
            try {
                // First, cache the movie if not already cached
                await this._database.cacheMovie(this._movie);

                // Then save the log entry
                await this._database.logMovie(
                    data.movie_id,
                    data.rating,
                    data.date,
                    data.notes
                );

                // Reload log entry
                await this._loadData();

                // Emit signal to refresh log view
                this.emit('log-changed');

                console.log('Log entry saved successfully');
            } catch (error) {
                console.error('Failed to save log entry:', error);
            }
        });

        logDialog.connect('deleted', async (_, logId) => {
            try {
                await this._database.deleteLogEntry(logId);
                this._logEntry = null;
                this._updateLogStatus();

                // Emit signal to refresh log view
                this.emit('log-changed');

                console.log('Log entry deleted successfully');
            } catch (error) {
                console.error('Failed to delete log entry:', error);
            }
        });

        logDialog.present(this);
    }

    _formatRuntime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    }
});
