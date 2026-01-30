/* log-entry-dialog.js
 *
 * Copyright 2026 Ausath Ikram
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { RatingWidget } from './rating-widget.js';

export const LogEntryDialog = GObject.registerClass({
    GTypeName: 'LogEntryDialog',
    Signals: {
        'saved': {
            param_types: [GObject.TYPE_JSOBJECT],
        },
        'deleted': {
            param_types: [GObject.TYPE_INT],
        },
    },
}, class LogEntryDialog extends Adw.Dialog {
    constructor(movie, existingLog = null) {
        const title = existingLog ? _('Edit Log Entry') : _('Log Movie');
        
        super({
            title: title,
            content_width: 400,
            content_height: 450,
            can_close: true,
        });

        this._movie = movie;
        this._existingLog = existingLog;
        this._logId = existingLog ? existingLog.log_id : null;
        
        this._buildUI();
        
        if (existingLog) {
            this._ratingWidget.rating = existingLog.user_rating;
            this._dateEntry.set_text(existingLog.watched_date);
            this._notesEntry.set_text(existingLog.notes || '');
        } else {
            const today = new Date().toISOString().split('T')[0];
            this._dateEntry.set_text(today);
        }
    }

    _buildUI() {
        const toolbarView = new Adw.ToolbarView();

        const headerBar = new Adw.HeaderBar({
            show_title: true,
        });
        toolbarView.add_top_bar(headerBar);

        const scrolled = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vexpand: true,
        });

        const clamp = new Adw.Clamp({
            maximum_size: 400,
            margin_start: 24,
            margin_end: 24,
            margin_top: 24,
            margin_bottom: 24,
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 24,
        });

        // Error banner (initially hidden)
        this._errorBanner = new Adw.Banner({
            revealed: false,
        });
        box.append(this._errorBanner);

        // Movie info header
        const movieBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
        });

        const posterBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            width_request: 60,
            height_request: 90,
            css_classes: ['poster-placeholder', 'card'],
        });

        const posterIcon = new Gtk.Image({
            icon_name: 'video-x-generic-symbolic',
            pixel_size: 32,
            opacity: 0.5,
            valign: Gtk.Align.CENTER,
            vexpand: true,
        });
        posterBox.append(posterIcon);
        movieBox.append(posterBox);

        const titleBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            valign: Gtk.Align.CENTER,
        });

        const titleLabel = new Gtk.Label({
            label: this._movie.title,
            wrap: true,
            xalign: 0,
            css_classes: ['title-3'],
        });
        titleBox.append(titleLabel);

        const yearLabel = new Gtk.Label({
            label: this._movie.year ? `(${this._movie.year})` : '',
            xalign: 0,
            css_classes: ['dim-label'],
        });
        titleBox.append(yearLabel);

        movieBox.append(titleBox);
        box.append(movieBox);

        // Preferences group
        const prefsGroup = new Adw.PreferencesGroup({
            title: _('Log Details'),
        });

        // Rating row
        const ratingRow = new Adw.ActionRow({
            title: _('Rating'),
            subtitle: _('How would you rate this movie?'),
        });

        this._ratingWidget = new RatingWidget({
            rating: 0,
            interactive: true,
            valign: Gtk.Align.CENTER,
        });
        this._ratingWidget.connect('rating-changed', () => {
            this._clearError();
        });
        ratingRow.add_suffix(this._ratingWidget);
        prefsGroup.add(ratingRow);

        // Date row
        const dateRow = new Adw.ActionRow({
            title: 'Watched Date',
        });
        const dateBox = new Gtk.Box({
            spacing: 8,
            orientation: Gtk.Orientation.HORIZONTAL,
        });
        this._dateEntry = new Gtk.Entry({
            placeholder_text: 'YYYY-MM-DD',
            hexpand: true,
            input_purpose: Gtk.InputPurpose.DIGITS,
        });
        this._dateEntry.connect('changed', () => {
            this._clearError();
        });
        const todayButton = new Gtk.Button({
            label: 'Today',
            valign: Gtk.Align.CENTER,
        });
        todayButton.connect('clicked', () => {
            const today = new Date().toISOString().split('T')[0];
            this._dateEntry.text = today;
        });
        dateBox.append(this._dateEntry);
        dateBox.append(todayButton);
        dateRow.add_suffix(dateBox);
        dateRow.set_activatable_widget(this._dateEntry);
        prefsGroup.add(dateRow);

        // Notes row
        const notesRow = new Adw.ActionRow({
            title: 'Notes',
        });
        this._notesEntry = new Gtk.Entry({
            placeholder_text: 'Your thoughts about this movie...',
            hexpand: true,
        });
        notesRow.add_suffix(this._notesEntry);
        notesRow.set_activatable_widget(this._notesEntry);
        prefsGroup.add(notesRow);

        box.append(prefsGroup);
        clamp.set_child(box);
        scrolled.set_child(clamp);
        toolbarView.set_content(scrolled);

        // Button box
        const buttonBox = new Gtk.Box({
            spacing: 8,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
            halign: Gtk.Align.END,
        });

        if (this._existingLog) {
            const deleteButton = new Gtk.Button({
                label: 'Delete',
                css_classes: ['destructive-action'],
            });
            deleteButton.connect('clicked', () => this._showDeleteConfirmation());
            buttonBox.append(deleteButton);
        }

        const cancelButton = new Gtk.Button({
            label: 'Cancel',
        });
        cancelButton.connect('clicked', () => this.close());
        buttonBox.append(cancelButton);

        const saveButton = new Gtk.Button({
            label: 'Save',
            css_classes: ['suggested-action'],
        });
        saveButton.connect('clicked', () => this._saveLog());
        buttonBox.append(saveButton);

        toolbarView.add_bottom_bar(buttonBox);

        this.set_child(toolbarView);
    }

    _saveLog() {
        const rating = this._ratingWidget.rating;
        const date = this._dateEntry.text.trim();
        const notes = this._notesEntry.text.trim();

        // Validate rating
        if (rating < 1 || rating > 5) {
            this._showError('Please select a rating (1-5 stars)');
            return;
        }

        // Validate date format (basic check)
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!date || !datePattern.test(date)) {
            this._showError('Please enter a valid date (YYYY-MM-DD)');
            return;
        }

        // Validate date is actually valid (not 2026-99-99)
        const parts = date.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        
        if (month < 1 || month > 12) {
            this._showError('Invalid month (must be 01-12)');
            return;
        }
        
        if (day < 1 || day > 31) {
            this._showError('Invalid day (must be 01-31)');
            return;
        }
        
        // Check if the date is valid using Date object
        const watchedDate = new Date(year, month - 1, day);
        if (watchedDate.getFullYear() !== year || 
            watchedDate.getMonth() !== month - 1 || 
            watchedDate.getDate() !== day) {
            this._showError('Invalid date (e.g., Feb 30 does not exist)');
            return;
        }

        // Validate date is not in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (watchedDate > today) {
            this._showError('Watched date cannot be in the future');
            return;
        }

        // Emit saved signal with data
        this.emit('saved', {
            movie_id: this._movie.id,
            rating: rating,
            date: date,
            notes: notes || null,
            log_id: this._existingLog ? this._existingLog.id : null,
        });

        this.close();
    }

    _showDeleteConfirmation() {
        const dialog = new Adw.AlertDialog({
            heading: 'Delete Log Entry?',
            body: 'This action cannot be undone.',
        });

        dialog.add_response('cancel', 'Cancel');
        dialog.add_response('delete', 'Delete');
        dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.set_default_response('cancel');
        dialog.set_close_response('cancel');

        dialog.connect('response', (_, response) => {
            if (response === 'delete') {
                this.emit('deleted', this._existingLog.id);
                this.close();
            }
        });

        dialog.present(this);
    }

    _showError(message) {
        this._errorBanner.title = message;
        this._errorBanner.revealed = true;
        
        // Auto-hide after 5 seconds
        if (this._errorTimeout) {
            clearTimeout(this._errorTimeout);
        }
        this._errorTimeout = setTimeout(() => {
            this._errorBanner.revealed = false;
        }, 5000);
    }

    _clearError() {
        if (this._errorTimeout) {
            clearTimeout(this._errorTimeout);
        }
        this._errorBanner.revealed = false;
    }
});
