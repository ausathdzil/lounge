/* rating-widget.js
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

export const RatingWidget = GObject.registerClass({
    GTypeName: 'RatingWidget',
    Properties: {
        'rating': GObject.ParamSpec.int(
            'rating',
            'Rating',
            'The rating value (1-5)',
            GObject.ParamFlags.READWRITE,
            0, 5, 0
        ),
        'interactive': GObject.ParamSpec.boolean(
            'interactive',
            'Interactive',
            'Whether the widget accepts input',
            GObject.ParamFlags.READWRITE,
            true
        ),
    },
    Signals: {
        'rating-changed': {
            param_types: [GObject.TYPE_INT],
        },
    },
}, class RatingWidget extends Gtk.Box {
    constructor(params = {}) {
        // Extract our custom properties before passing to super
        const { rating, interactive, ...gtkParams } = params;
        
        super({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 2,
            ...gtkParams
        });

        this._rating = 0;
        this._interactive = interactive !== undefined ? interactive : true;
        this._starButtons = [];

        this._buildUI();
        
        // Now set rating after UI is built
        if (rating !== undefined) {
            this.rating = rating;
        }
    }

    _buildUI() {
        // Create 5 star buttons
        for (let i = 1; i <= 5; i++) {
            const button = new Gtk.Button({
                icon_name: 'star-outline-symbolic',
                css_classes: ['flat', 'circular'],
                width_request: 24,
                height_request: 24,
            });

            // Store the rating value this button represents
            button._ratingValue = i;

            // Connect click handler
            button.connect('clicked', () => {
                if (this._interactive) {
                    this.rating = i;
                    this.emit('rating-changed', i);
                }
            });

            this._starButtons.push(button);
            this.append(button);
        }

        // Initial update
        this._updateStars();
    }

    get rating() {
        return this._rating;
    }

    set rating(value) {
        if (this._rating !== value) {
            this._rating = Math.max(0, Math.min(5, value));
            this._updateStars();
            this.notify('rating');
        }
    }

    get interactive() {
        return this._interactive;
    }

    set interactive(value) {
        if (this._interactive !== value) {
            this._interactive = value;
            this._updateStars();
            this.notify('interactive');
        }
    }

    _updateStars() {
        // Safety check in case this is called before _buildUI
        if (!this._starButtons || this._starButtons.length === 0) {
            return;
        }
        
        this._starButtons.forEach((button, index) => {
            const starNumber = index + 1;
            
            if (starNumber <= this._rating) {
                // Filled star
                button.icon_name = 'starred-symbolic';
                button.css_classes = this._interactive 
                    ? ['flat', 'circular', 'accent'] 
                    : ['flat', 'circular'];
            } else {
                // Empty star
                button.icon_name = 'non-starred-symbolic';
                button.css_classes = ['flat', 'circular', 'dim-label'];
            }
        });
    }

    // Convenience method to get rating as stars string
    getRatingText() {
        if (this._rating === 0) {
            return _('Not rated');
        }
        return '★'.repeat(this._rating) + '☆'.repeat(5 - this._rating);
    }
});
