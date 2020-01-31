/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const St        = imports.gi.St;
const Main      = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Gio       = imports.gi.Gio;
const Meta      = imports.gi.Meta;
const Shell     = imports.gi.Shell;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Settings
const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.tidalwm';

var displaySignals = [];
var settingsSignals = [];
var monitorSignals = [];
var workspaceManagerSignals = [];
var extension;

class Extension {
    getSettings(schema) {
        let gschema = Gio.SettingsSchemaSource.new_from_directory(
            Me.dir.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        );

        let settings = new Gio.Settings({
            settings_schema: gschema.lookup('org.gnome.shell.extensions.tidalwm', true)
        });

        return settings;
    }

    constructor() {}

    enable() {
        this._settings = this.getSettings(SETTINGS_SCHEMA);
        this.log = new Me.imports.logging.Logging(this._settings);
        if (!this._tidal) {
            this._tidal = new Me.imports.tidal.Tidal(this._settings, this.log);
        }
        this.setupSignalHandling();
    }

    setupSignalHandling() {
        settingsSignals.push(
            this._settings.connect(
                "changed::window-gaps",
                this.gapsChanged
            )
        );

        settingsSignals.push(
            this._settings.connect(
                "changed::smart-gaps",
                this.gapsChanged
            )
        );

        settingsSignals.push(
            this._settings.connect(
                "changed::initial-direction",
                this.directionChanged
            )
        );

        settingsSignals.push(
            this._settings.connect(
                "changed::log-level", (settings) =>
                this.logLevelChanged(settings)
            )
        );

        displaySignals.push(
            global.display.connect(
                "window-created",
                (display, window) => {
                    let monitor = window.get_monitor();
                    let workspace = window.get_workspace().index();
                    //this.log(`extension.js: window ${window.get_id()} created on monitor ${monitor} on workspace ${workspace}`);
                    this.windowCreated(window);
                }
            )
        );

        displaySignals.push(
            global.display.connect(
                "window-left-monitor", (display, number, window) => {
                    if (window.get_workspace()) {
                        //this.log(`extension.js: window ${window.get_id()} left monitor ${number} on workspace ${window.get_workspace().index()} (now on ${number})`);
                        if (window.get_window_type() == 0) {
                            this._tidal.windowLeftMonitor(window, number);
                        }
                    } else {
                        //this.log(`extension.js: window ${window.get_id()} closed`);
                        if (window.get_window_type() == 0) {
                            this._tidal.closeWindow(window);
                        }
                    }
                }
            )
        );

        displaySignals.push(
            global.display.connect(
                "window-entered-monitor", (display, number, window) => {
                    //this.log(`extension.js: window ${window.get_id()} entered monitor ${number} on workspace ${window.get_workspace().index()}`);
                    if (window.get_window_type() == 0) {
                        //this._tidal.windowEnteredMonitor(window, number);
                    }
                }
            )
        );

        displaySignals.push(
            global.display.connect("grab-op-end", (obj, display, window, op) => {
                if (window && window.get_window_type() == 0) { 
                    //this.log(`extension.js: grab op ${op} ended for ${window.get_id()}`);
                    if (window &&
                        (op == 36865        // resize (nw)
                        || op == 40961      // resize (ne)
                        || op == 24577      // resize (se)
                        || op == 20481      // resize (sw)
                        || op == 16385      // resize (s)
                        || op == 32769      // resize (n)
                        || op == 4097       // resize (w)
                        || op == 8193)) {   // resize (e)
                            this._tidal.resetWindow(window);
                    } else if (window && op == 1 /* move */) {
                        this._tidal.dragWindow(window);
                    }
                }
            })
        );

        monitorSignals.push(
            Meta.MonitorManager.get().connect("monitors-changed", (monitors) => {
                /// placeholder
            })
        );

        workspaceManagerSignals.push(
            global.workspace_manager.connect("workspace-added", (manager, workspace) => {
                /// placeholder
                this._tidal.initWorkspace(workspace);
            })
        );

        workspaceManagerSignals.push(
            global.workspace_manager.connect("workspace-removed", (manager, workspace) => {
                /// placeholder
            })
        );

        workspaceManagerSignals.push(
            global.workspace_manager.connect("workspaces-reordered", () => {
                /// placeholder
            })
        );

        this.addKeyBinding("rotate-windows", (display) => this._tidal.rotateWindows(this._tidal, display));
        this.addKeyBinding("float-window", (display) => this._tidal.floatWindow(this._tidal, display));
    }

    disable() {
        displaySignals.forEach(signal => global.display.disconnect(signal));
        settingsSignals.forEach(signal => this._settings.disconnect(signal));
        monitorSignals.forEach(signal => Meta.MonitorManager.get().disconnect(signal));
        this.removeKeyBinding("rotate-windows");
        this.removeKeyBinding("float-window");
        this.log("Disabled");
    }

    gapsChanged(data) {
        this.log(`extension.js: gaps value has changed: ${data.get_int("window-gaps")}`);
    }

    directionChanged(data) {
        this.log(`extension.js: initial direction changed ${data.get_int("initial-direction")}`);
    }

    logLevelChanged(data) {
        this.log.log(`extension.js: log level changed to ${data.get_int("log-level")}`);
        this.log.logLevel = data.get_int("log-level");
        data.apply();
    }

    windowCreated(window) {
        let actor = window.get_compositor_private();

        let id = actor.connect('first-frame', () =>  {
            if (window.get_window_type() == 0) {
                log(`extension.js: window ${window.get_id()} created`);
                this._tidal.addWindow(window);
            }
            actor.disconnect(id);
        });
    }

    addKeyBinding(key, cb) {
        if (Main.wm.addKeybinding && Shell.ActionMode) { // introduced in 3.16
            Main.wm.addKeybinding(
                key,
                this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL,
                cb
            );
        }
        else if (Main.wm.addKeybinding && Shell.KeyBindingMode) { // introduced in 3.7.5
            Main.wm.addKeybinding(
                key,
                this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.KeyBindingMode.NORMAL | Shell.KeyBindingMode.MESSAGE_TRAY,
                cb
            );
        }
        else {
            global.display.add_keybinding(
                key,
                this._settings,
                Meta.KeyBindingFlags.NONE,
                cb
            );
        }
    }

    removeKeyBinding(key) {
        if (Main.wm.removeKeybinding) { // introduced in 3.7.2
            Main.wm.removeKeybinding(key);
        }
        else {
            global.display.remove_keybinding(key);
        }
    }
}

function init() {
    if (!extension) {
        extension = new Extension();
    }
    return extension;
}
