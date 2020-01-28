const Clutter = imports.gi.Clutter;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var Tidal = class TidalClass {

    constructor(settings) {
        log(`Constructing new TidalWM`);
        this.settings = settings;
        this.windows = {};
        this.pools = {};

        for (var i = 0; i < global.workspace_manager.get_n_workspaces(); i++) {
            let workspace = global.workspace_manager.get_workspace_by_index(i);

            workspace.connect("window-added", (workspace, window) => {
                log(`workspace::window-added ${window.get_id()} ${window.get_window_type()} on ${window.get_monitor()} added to ${workspace.index()}`);
                this.addWindow(window);
            });

            workspace.connect("window-removed", (workspace, window) => {
                log(`workspace::window-removed ${window.get_id()} ${window.get_window_type()} on ${window.get_monitor()} left ${workspace.index()}`);
                this.removeWindow(window);
            });

            this.cacheWindows(workspace);
        }

        this.setupPools();
    }

    // adds a window to Tidal's management system
    addWindow(window) {
        let windowType = window.get_window_type();

        // only handle normal windows for now
        if (windowType == 0) {
            let id = window.get_id();
            let workspace = window.get_workspace();
            let monitor = window.get_monitor();

            let rendered = this.windows[id] && this.windows[id].rendered;
            let floating = this.windows[id] && this.windows[id].floating;

            let tidal = this;
            window.connect("focus", (window) => this.windowFocusChanged(tidal, window));

            this.windows[id] = {
                id,
                workspace,
                monitor,
                window,
                rendered,
                floating
            };

            if (rendered && !floating) {
                this.pools[`${workspace.index()}-${monitor}`].addWindow(window);
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

    // signal that a window is ready to be operated on
    renderWindow(window) {
        if (window.get_window_type() == 0) {
            let workspace = window.get_workspace();
            let monitor = window.get_monitor();

            this.windows[window.get_id()].rendered = true;
            this.pools[`${workspace.index()}-${monitor}`].addWindow(window);

            let alwaysFloat = this.settings.get_strv("always-float")[0].split(",");
            let wmClass = window.get_wm_class();

            if (alwaysFloat.includes(wmClass)) {
                this.floatWindow(this, window.get_display());
            }
        }
    }

    // removes the window from being managed by a pool
    removeWindow(window) {
        if (window.get_window_type() == 0) {
            let id = window.get_id();
            let monitor = this.windows[id].monitor;
            let workspace = this.windows[id].workspace;

            this.pools[`${workspace.index()}-${monitor}`].removeWindow(window);

            this.setWindowOpacities();
        }
    }

    // removes the window from Tidal's management completely
    closeWindow(window) {
        if (window.get_window_type() == 0) {
            this.removeWindow(window);
            let id = window.get_id();
            delete this.windows[id];
        }
    }

    // has the window re-positioned in its container, if it isn't floating
    resetWindow(window) {
        log(`tidal resetting window ${window.get_id()}`);
        if (window) {
            let id = window.get_id();
            if (this.windows[id] && !this.windows[id].floating) {
                let workspace = window.get_workspace().index();
                let display = window.get_monitor();
                this.pools[`${workspace}-${display}`].resetWindow(window);
            }
        }
    }

    // toggles floating a window by un-tiling and setting always above
    floatWindow(self, display) {
        let id = display.get_focus_window().get_id();
        log(`toggle floating for active window ${id}`);

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

    // rotate the windows through the tiling algo
    rotateWindows(self, display) {
        let focused = display.get_focus_window();
        if (focused) {
            let workspace = focused.get_workspace().index();
            let monitor = focused.get_monitor();
            self.pools[`${workspace}-${monitor}`].rotateWindows();
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
        }
    }

    // ensure there is a window pool for each monitor on every workspace
    setupPools() {
        let pools = {};

        for (var pool in this.pools) {
            let current = this.pools[pool];
            let monitor = current.getEffectiveMonitor();
            let workspace = current.getEffectiveWorkspace();
            if (monitor !== null && workspace !== null) {
                pools[`${workspace}-${monitor}`] = current;
            }
        }


        for (var i = 0; i < global.workspace_manager.get_n_workspaces(); i++) {
            let workspace = global.workspace_manager.get_workspace_by_index(i);

            for (var j = 0; j < workspace.get_display().get_n_monitors(); j++) {
                if (!pools[`${i}-${j}`]) {
                    pools[`${i}-${j}`] = new Me.imports.pool.Pool(this.settings, i, j);
                }
            }
        }

        this.pools = pools;
    }

}
