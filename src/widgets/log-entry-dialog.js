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
            content_width: 420,
            content_height: 480,
            can_close: true,
        });

        this._movie = movie;
        this._existingLog = existingLog;
        this._logId = existingLog ? existingLog.log_id : null;

        this._buildUI();

        if (existingLog) {
            this._ratingWidget.rating = existingLog.user_rating;
            this._dateRow.text = existingLog.watched_date;
            this._notesRow.text = existingLog.notes || '';
        } else {
            const today = new Date().toISOString().split('T')[0];
            this._dateRow.text = today;
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
            maximum_size: 420,
            margin_start: 24,
            margin_end: 24,
            margin_top: 24,
            margin_bottom: 24,
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 24,
        });

        // Movie context line
        const movieContext = this._movie.year
            ? `${this._movie.title} (${this._movie.year})`
            : this._movie.title;
        const movieLabel = new Gtk.Label({
            label: movieContext,
            wrap: true,
            xalign: 0.5,
            justify: Gtk.Justification.CENTER,
            css_classes: ['dim-label'],
        });
        box.append(movieLabel);

        // --- Rating group ---
        const ratingGroup = new Adw.PreferencesGroup();

        const ratingRow = new Adw.ActionRow({
            title: _('Your Rating'),
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
        ratingGroup.add(ratingRow);

        box.append(ratingGroup);

        // --- Date & Notes group ---
        const detailsGroup = new Adw.PreferencesGroup();

        // Date row
        this._dateRow = new Adw.EntryRow({
            title: _('Watched Date'),
            input_purpose: Gtk.InputPurpose.FREE_FORM,
        });
        this._dateRow.connect('changed', () => {
            this._clearError();
        });

        const todayButton = new Gtk.Button({
            label: _('Today'),
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });
        todayButton.connect('clicked', () => {
            const today = new Date().toISOString().split('T')[0];
            this._dateRow.text = today;
        });
        this._dateRow.add_suffix(todayButton);
        detailsGroup.add(this._dateRow);

        // Notes row
        this._notesRow = new Adw.EntryRow({
            title: _('Notes'),
        });
        detailsGroup.add(this._notesRow);

        box.append(detailsGroup);

        clamp.set_child(box);
        scrolled.set_child(clamp);
        toolbarView.set_content(scrolled);

        // Bottom bar container (error + buttons)
        const bottomBar = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0,
        });

        // Error display with revealer
        this._errorRevealer = new Gtk.Revealer({
            reveal_child: false,
            transition_type: Gtk.RevealerTransitionType.SWING_DOWN,
            transition_duration: 200,
        });

        this._errorLabel = new Gtk.Label({
            wrap: true,
            xalign: 0.5,
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 16,
            margin_end: 16,
            css_classes: ['log-entry-error'],
        });

        const errorBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_start: 12,
            margin_end: 12,
            margin_top: 8,
            css_classes: ['log-entry-error-box'],
        });
        errorBox.append(this._errorLabel);

        this._errorRevealer.set_child(errorBox);
        bottomBar.append(this._errorRevealer);

        // Button bar
        const buttonBox = new Gtk.Box({
            spacing: 8,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
            halign: Gtk.Align.END,
        });

        if (this._existingLog) {
            this._deleteButton = new Gtk.Button({
                label: _('Delete'),
                css_classes: ['destructive-action'],
            });
            this._deleteButton.connect('clicked', () => this._showDeleteConfirmation());
            buttonBox.append(this._deleteButton);

            // Spacer to push Delete to the left
            const spacer = new Gtk.Box({ hexpand: true });
            buttonBox.append(spacer);
            buttonBox.halign = Gtk.Align.FILL;
        }

        this._cancelButton = new Gtk.Button({
            label: _('Cancel'),
        });
        this._cancelButton.connect('clicked', () => this.close());
        buttonBox.append(this._cancelButton);

        this._saveButton = new Gtk.Button({
            label: _('Save'),
            css_classes: ['suggested-action'],
        });
        this._saveButton.connect('clicked', () => this._saveLog());
        buttonBox.append(this._saveButton);

        bottomBar.append(buttonBox);
        toolbarView.add_bottom_bar(bottomBar);

        this.set_child(toolbarView);
    }

    _saveLog() {
        const rating = this._ratingWidget.rating;
        const date = this._dateRow.text.trim();
        const notes = this._notesRow.text.trim();

        // Validate rating
        if (rating < 1 || rating > 5) {
            this._showError(_('Please select a rating (1-5 stars)'));
            return;
        }

        // Validate date format (basic check)
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!date || !datePattern.test(date)) {
            this._showError(_('Please enter a valid date (YYYY-MM-DD)'));
            return;
        }

        // Validate date is actually valid (not 2026-99-99)
        const parts = date.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);

        if (month < 1 || month > 12) {
            this._showError(_('Invalid month (must be 01-12)'));
            return;
        }

        if (day < 1 || day > 31) {
            this._showError(_('Invalid day (must be 01-31)'));
            return;
        }

        // Check if the date is valid using Date object
        const watchedDate = new Date(year, month - 1, day);
        if (watchedDate.getFullYear() !== year ||
            watchedDate.getMonth() !== month - 1 ||
            watchedDate.getDate() !== day) {
            this._showError(_('Invalid date (e.g., Feb 30 does not exist)'));
            return;
        }

        // Validate date is not in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (watchedDate > today) {
            this._showError(_('Watched date cannot be in the future'));
            return;
        }

        // Disable buttons to prevent double-clicks
        this._saveButton.sensitive = false;
        this._cancelButton.sensitive = false;
        if (this._deleteButton) this._deleteButton.sensitive = false;
        this._saveButton.label = _('Saving...');

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
            heading: _('Delete Log Entry?'),
            body: _('This action cannot be undone.'),
        });

        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('delete', _('Delete'));
        dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.set_default_response('cancel');
        dialog.set_close_response('cancel');

        dialog.connect('response', (_, response) => {
            if (response === 'delete') {
                this.emit('deleted', this._existingLog.log_id);
                this.close();
            }
        });

        dialog.present(this);
    }

    _showError(message) {
        this._errorLabel.label = message;
        this._errorRevealer.reveal_child = true;

        // Auto-hide after 5 seconds
        if (this._errorTimeout) {
            clearTimeout(this._errorTimeout);
        }
        this._errorTimeout = setTimeout(() => {
            this._errorRevealer.reveal_child = false;
        }, 5000);
    }

    _clearError() {
        if (this._errorTimeout) {
            clearTimeout(this._errorTimeout);
        }
        this._errorRevealer.reveal_child = false;
    }
});
