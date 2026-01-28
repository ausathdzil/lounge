/* main.js
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
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk?version=4.0';
import Adw from 'gi://Adw?version=1';

import { LoungeWindow } from './window.js';
import { DatabaseService } from './services/database.js';

pkg.initGettext();
pkg.initFormat();

export const LoungeApplication = GObject.registerClass(
    class LoungeApplication extends Adw.Application {
        constructor() {
            super({
                application_id: 'io.github.ausathdzil.lounge',
                flags: Gio.ApplicationFlags.DEFAULT_FLAGS,
                resource_base_path: '/io/github/ausathdzil/lounge'
            });

            // Initialize database service
            this.database = new DatabaseService();

            const quit_action = new Gio.SimpleAction({name: 'quit'});
                quit_action.connect('activate', action => {
                this.quit();
            });
            this.add_action(quit_action);
            this.set_accels_for_action('app.quit', ['<control>q']);

            const show_about_action = new Gio.SimpleAction({name: 'about'});
            show_about_action.connect('activate', action => {
                const aboutParams = {
                    application_name: 'lounge',
                    application_icon: 'io.github.ausathdzil.lounge',
                    developer_name: 'Ausath Ikram',
                    version: '0.1.0',
                    developers: [
                        'Ausath Ikram'
                    ],
                    // Translators: Replace "translator-credits" with your name/username, and optionally an email or URL.
                    translator_credits: _("translator-credits"),
                    copyright: '© 2026 Ausath Ikram'
                };
                const aboutDialog = new Adw.AboutDialog(aboutParams);
                aboutDialog.present(this.active_window);
            });
            this.add_action(show_about_action);
        }

        vfunc_activate() {
            let {active_window} = this;

            if (!active_window) {
                // Initialize database on first activation
                this.database.initialize().catch(error => {
                    logError(error, 'Failed to initialize database');
                });

                // Load custom CSS on first activation
                const provider = new Gtk.CssProvider();
                const css = `
                    .poster-placeholder {
                        background-color: alpha(currentColor, 0.1);
                        border-top-left-radius: 12px;
                        border-top-right-radius: 12px;
                        border-bottom-left-radius: 0;
                        border-bottom-right-radius: 0;
                    }
                    
                    /* Make flowboxchild focusable and interactive */
                    flowboxchild {
                        border-radius: 12px;
                    }
                    
                    flowboxchild:hover .card {
                        background-color: alpha(currentColor, 0.05);
                    }
                    
                    flowboxchild:focus .card {
                        outline: 2px solid @accent_color;
                        outline-offset: 2px;
                    }
                `;
                provider.load_from_string(css);
                Gtk.StyleContext.add_provider_for_display(
                    Gdk.Display.get_default(),
                    provider,
                    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
                );

                active_window = new LoungeWindow(this);
            }

            active_window.present();
        }
    }
);

export function main(argv) {
    const application = new LoungeApplication();
    return application.runAsync(argv);
}
