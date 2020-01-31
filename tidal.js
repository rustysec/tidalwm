const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Spiral = Me.imports.spiral.Spiral;

var Tidal = class TidalClass {

    constructor(settings, logging) {
        this.settings = settings;
        this.log = logging;
        this.windows = {};

        let tilingMode = this.settings.get_int("tile-mode");
        if (tilingMode == 0) {
            this.poolType = Spiral;
        } else {
            log(`tidal.js: unsupported tiling mode ${tilingMode}, using spiral`);
        }

        this.pool = new this.poolType(this.settings, this.log);
        this.initWorkspace();
    }

    // adds a window to Tidal's management system
    addWindow(window) {
        let windowType = window.get_window_type();

        // only handle normal windows for now
        if (windowType == 0) {
            log(`tidal.js: adding window ${window.get_id()}`);

            let id = window.get_id();
            let workspace = window.get_workspace().index();
            let monitor = window.get_monitor();
            let isFloating = this.windows[id] && this.windows[id].floating;

            let alwaysFloat = this.settings.get_strv("always-float")[0].split(",");
            let wmClass = window.get_wm_class();
            let floating = isFloating || alwaysFloat.includes(wmClass);

            let tidal = this;
            window.connect("focus", (window) => this.windowFocusChanged(tidal, window));

            this.windows[id] = {
                id,
                workspace,
                monitor,
                window,
                floating
            };

            if (!floating) {
                this.pool.addWindow(window);
            }

            this.setWindowOpacities();
        }
    }

    // handle window focus events
    windowFocusChanged(tidal, window) {
        if (window.get_window_type() == 0) {
            let id = window.get_id();
            tidal.setWindowOpacities();
        }
    }

    // walk the window list and adjust opacities accordingly
    setWindowOpacities() {
        let opacity = (this.settings.get_int("inactive-opacity") / 100) * 255;

        global.get_window_actors().forEach(actor => {
            let meta = actor.get_meta_window();
            if (meta && meta.get_window_type() == 0) {
                if (meta.appears_focused) {
                    actor.opacity = 255;
                } else {
                    actor.opacity = opacity;
                }
            }
        });
    }

    closeWindow(window) {
        let id = window.get_id();
        log(`tidal.js: closing window ${id}`);
        this.pool.removeWindow(window);
        delete this.windows[id];
    }

    // removes the window from being managed by a pool
    removeWindow(window) {
        if (window.get_window_type() == 0) {
            let id = window.get_id();

            let monitor = this.windows[id].monitor;
            let workspace = this.windows[id].workspace;

            this.pool.removeWindow(window);
        }
    }

    // has the window re-positioned in its container, if it isn't floating
    resetWindow(window) {
        if (window) {
            let id = window.get_id();
            if (this.windows[id] && !this.windows[id].floating) {
                this.pool.resetWindow(window);
            }
        }
    }

    dragWindow(window) {
        if (this.pool.dragWindow) {
            this.pool.dragWindow(window);
        } else {
            this.resetWindow(window);
        }
    }

    // toggles floating a window by un-tiling and setting always above
    floatWindow(self, display) {
        let id = display.get_focus_window().get_id();

        let window = self.windows[id];
        if (window && window.floating) {
            window.floating = false;
            window.window.unmake_above();
            self.addWindow(window.window);
        } else if (window && !window.floating) {
            window.floating = true;
            window.window.make_above();
            self.removeWindow(window.window);
        }
    }

    windowLeftMonitor(window, monitor) {
        if (this.windows[window.get_id()]) {
            log(`tidal.js: window ${window.get_id()} left monitor ${monitor} -> ${window.get_monitor()}`);
            this.pool.updateWindow(window);
        }
    }

    windowEnteredMonitor(window, monitor) {
        if (this.windows[window.get_id()]) {
            log(`tidal.js: window ${window.get_id()} entered monitor ${monitor}`);
        }
    }

    // rotate the windows through the tiling algo
    rotateWindows(self, display) {
        let focused = display.get_focus_window();
        if (focused) {
            let workspace = focused.get_workspace().index();
            let monitor = focused.get_monitor();
            self.pool.rotateWindows(workspace, monitor);
        }
    }

    // gets a list of the windows on a given workspace and caches
    // information about it for later use
    cacheWindows(workspace) {
        if (workspace) {
            workspace
                .list_windows()
                .forEach((window, index) => {
                    if (this.windows[window.get_id()]) {
                        let existing = this.windows[window.get_id()];
                        existing.monitor = window.get_monitor();
                        existing.workspace = window.get_workspace();
                        this.windows[window.get_id()] = existing;
                    } else {
                        this.windows[window.get_id()] = {
                            id: window.get_id(),
                            workspace: window.get_workspace(),
                            monitor: window.get_monitor(),
                            window: window
                        };
                    }
                });
        } else {
            for (var i = 0; i < global.workspace_manager.get_n_workspaces(); i++) {
                this.cacheWindows(global.workspace_manager.get_workspace_by_index(i));
            }
        }
    }

    windowAdded(workspace, window) {
        let id = window.get_id();
        let item  = this.windows[id];

        if (item) {
            let newWorkspace = window.get_workspace().index();
            let newMonitor = window.get_monitor();

            log(`tidal.js: window ${id} added to ${newWorkspace}, ${newMonitor}`);
            this.pool.updateWindow(window);
        }
    }

    windowRemoved(workspace, window) {
        let id = window.get_id();
        let item  = this.windows[id];

        if (!item)
            return;

        item.oldWorkspace = item.workspace;
        item.oldMonitor = item.monitor;

        item.workspace = window.get_workspace().index();
        item.monitor = window.get_monitor();

        log(`tidal.js: window ${id} removed from ${item.workspace}, ${item.monitor}`);
    }

    initWorkspace(workspace) {
        if (workspace !== undefined && workspace !== null) {
            log(`tidal.js: initializing workspace ${workspace}`);
            global.workspace_manager.get_workspace_by_index(workspace).connect("window-added", (ws, w) => this.windowAdded(ws, w));
            global.workspace_manager.get_workspace_by_index(workspace).connect("window-removed", (ws, w) => this.windowRemoved(ws, w));
        } else {
            for (var i = 0; i < global.workspace_manager.get_n_workspaces(); i++) {
                this.initWorkspace(i);
            }
        }
    }
}
