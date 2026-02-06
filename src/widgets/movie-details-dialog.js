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
import { LogEntryDialog } from './log-entry-dialog.js';

export const MovieDetailsDialog = GObject.registerClass({
    GTypeName: 'MovieDetailsDialog',
    Signals: {
        'log-changed': {},
    },
}, class MovieDetailsDialog extends Adw.Dialog {
    constructor(movie, database, tmdbService = null) {
        super({
            title: movie.title,
            content_width: 600,
            content_height: 500,
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

        this._contentMainBox = new Gtk.Box({
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
        this._metaLabel = new Gtk.Label({
            label: '',
            wrap: true,
            xalign: 0,
            css_classes: ['dim-label'],
            visible: false,
        });
        infoBox.append(this._metaLabel);

        // Director
        this._directorLabel = new Gtk.Label({
            label: '',
            wrap: true,
            xalign: 0,
            visible: false,
        });
        infoBox.append(this._directorLabel);

        // Update meta fields if data is already available
        this._updateMetaFields();

        headerBox.append(infoBox);
        this._contentMainBox.append(headerBox);

        // Overview section
        const overviewHeading = new Gtk.Label({
            label: _('Overview'),
            xalign: 0,
            css_classes: ['title-4'],
        });
        this._contentMainBox.append(overviewHeading);

        this._overviewLabel = new Gtk.Label({
            label: this._movie.overview || _('No overview available'),
            wrap: true,
            xalign: 0,
            selectable: true,
        });
        this._contentMainBox.append(this._overviewLabel);

        // Log status section
        this._logStatusBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            margin_top: 12,
        });
        
        this._logStatusLabel = new Gtk.Label({
            xalign: 0,
            css_classes: ['dim-label'],
            visible: false,
        });
        this._logStatusBox.append(this._logStatusLabel);
        
        this._logButton = new Gtk.Button({
            label: _('Log Movie'),
            css_classes: ['suggested-action'],
        });
        this._logButton.connect('clicked', () => this._openLogDialog());
        this._logStatusBox.append(this._logButton);
        
        this._contentMainBox.append(this._logStatusBox);

        scrolled.set_child(this._contentMainBox);
        return scrolled;
    }

    _updateMetaFields() {
        const metaParts = [];
        if (this._movie.runtime) {
            metaParts.push(this._formatRuntime(this._movie.runtime));
        }
        if (this._movie.genres) {
            metaParts.push(this._movie.genres);
        }
        
        if (metaParts.length > 0) {
            this._metaLabel.label = metaParts.join(' \u2022 ');
            this._metaLabel.visible = true;
        }

        if (this._movie.director) {
            this._directorLabel.label = `Director: ${this._movie.director}`;
            this._directorLabel.visible = true;
        }

        if (this._movie.overview && this._overviewLabel) {
            this._overviewLabel.label = this._movie.overview;
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
            // Movie is logged - show info and change button
            const stars = '★'.repeat(this._logEntry.user_rating);
            const emptyStars = '☆'.repeat(5 - this._logEntry.user_rating);
            this._logStatusLabel.label = `Your rating: ${stars}${emptyStars} • Watched: ${this._logEntry.watched_date}`;
            this._logStatusLabel.visible = true;
            this._logButton.label = _('Edit Log');
            this._logButton.css_classes = [''];
        } else {
            // Movie not logged - hide info and show "Log Movie" button
            this._logStatusLabel.visible = false;
            this._logButton.label = _('Log Movie');
            this._logButton.css_classes = ['suggested-action'];
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
