const Clutter   = imports.gi.Clutter;
const GObject   = imports.gi.GObject;
const Main      = imports.ui.main;
const Meta      = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const ActiveHighlight = Me.imports.highlight.ActiveHighlight;
const Spiral = Me.imports.spiral.Spiral;

var Tidal = class TidalClass {

    constructor(settings, logging) {
        this.settings = settings;
        this.log = logging;
        this.windows = {};

        // sets up the active highlighter
        this.activeHighlight = new ActiveHighlight(settings);

        let tilingMode = this.settings.get_int("tile-mode");
        if (tilingMode == 0) {
            this.poolType = Spiral;
        } else {
            log.log.log(`tidal.js: unsupported tiling mode ${tilingMode}, using spiral`);
        }

        this.pool = new this.poolType(this.settings, this.log);
        this.initWorkspace();
    }

    // adds a window to Tidal's management system
    addWindow(window) {
        let windowType = window.get_window_type();

        // only handle normal windows for now
        if (windowType == 0) {
            this.log.debug(`tidal.js: adding window ${window.get_id()}`);

            let id = window.get_id();
            let workspace = window.get_workspace().index();
            let monitor = window.get_monitor();
            let isFloating = this.windows[id] && this.windows[id].floating;

            let alwaysFloat = this.settings.get_strv("always-float")[0].split(",");
            let wmClass = window.get_wm_class();
            let floating = isFloating || alwaysFloat.includes(wmClass);

            let tidal = this;
            window.connect("focus", (window) => this.windowFocusChanged(tidal, window));
            window.connect("shown", (window) => this.windowShown(tidal, window));
            window.get_compositor_private().connect("effects-completed", (window) => this.checkWindowMinimized(tidal, window));

            this.windows[id] = {
                id,
                workspace,
                monitor,
                window,
                floating,
                minimized: window.minimized
            };

            if (!floating) {
                this.pool.addWindow(window);
            }

            this.setWindowOpacities();
        }
    }

    checkWindowMinimized(tidal, window) {
        let meta = window.get_meta_window();

        if (meta.minimized) {
            tidal.log.verbose(`tidal.js: window ${meta.get_id()} minimized`);
            this.windows[meta.get_id()].minimized = true;
            let workspace = meta.get_workspace().index();
            let monitor = meta.get_monitor();
            this.pool.execute(workspace, monitor);
            this.setWindowOpacities();
        }
    }

    windowShown(tidal, meta) {
        let id = meta.get_id();

        if (this.windows[id].minimized && !meta.minimized) {
            tidal.log.verbose(`tidal.js: window ${meta.get_id()} shown`);
            this.windows[id].minimized = meta.minimized;
            let workspace = meta.get_workspace().index();
            let monitor = meta.get_monitor();
            this.pool.execute(workspace, monitor);
            this.setWindowOpacities();
        }
    }

    // handle window focus events
    windowFocusChanged(tidal, window) {
        tidal.log.debug(`tidal.js: window focus changed to ${window.get_id()}`);
        if (window.get_window_type() == 0) {
            let id = window.get_id();
            tidal.setWindowOpacities();
        }
    }

    // walk the window list and adjust opacities accordingly
    setWindowOpacities() {
        let opacity = (this.settings.get_int("inactive-opacity") / 100) * 255;
        let highlight = this.settings.get_boolean("highlight-active") && this.activeHighlight;

        if (highlight && this.activeHighlight.hide) {
            this.activeHighlight.hide();
        }

        global.get_window_actors().forEach(actor => {
            let meta = actor.get_meta_window();
            if (meta && meta.get_window_type() == 0 && !meta.minimized) {
                if (meta.appears_focused || meta.is_attached_dialog()) {
                    this.log.verbose(`tidal.js: window ${meta.get_id()} focused`);
                    actor.opacity = 255;

                    if (highlight && meta.get_workspace().index() === global.workspace_manager.get_active_workspace_index()) {
                        this.log.verbose(`tidal.js: adding highlight to ${meta.get_id()}`);
                        let scale = meta.get_workspace()
                                .get_display()
                                .get_monitor_scale(meta.get_monitor());

                        if (highlight && (!this.activeHighlight || !this.activeHighlight.show)) {
                            this.log.debug(`tidal.js: ActiveHighlight was lost`);
                            this.activeHighlight = new ActiveHighlight(this.settings);
                        }
                        this.activeHighlight.window = meta;
                        this.activeHighlight.show();
                        this.activeHighlight.refresh();
                        Main.activateWindow(meta);
                    }
                } else {
                    actor.opacity = opacity;
                }
            }
        });
    }

    // walk the window list and adjust opacities accordingly
    getActiveWindow() {
        return global.get_window_actors().filter(actor => {
            let meta = actor.get_meta_window();
            return meta && meta.get_window_type() == 0 && meta.appears_focused;
        }).map(actor => actor.get_meta_window())[0];
    }

    closeWindow(window) {
        let id = window.get_id();
        this.log.verbose(`tidal.js: closing window ${id}`);
        this.pool.removeWindow(window);
        
        delete this.windows[id];
        this.setWindowOpacities();
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
                this.activeHighlight.window = window;
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
        if (display) {
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
    }

    windowLeftMonitor(window, monitor) {
        if (this.windows[window.get_id()]) {
            this.log.verbose(`tidal.js: window ${window.get_id()} left monitor ${monitor} -> ${window.get_monitor()}`);
            this.pool.updateWindow(window);
        }
    }

    windowEnteredMonitor(window, monitor) {
        if (this.windows[window.get_id()]) {
            this.log.verbose(`tidal.js: window ${window.get_id()} entered monitor ${monitor}`);
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

            this.log.debug(`tidal.js: window ${id} added to ${newWorkspace}, ${newMonitor}`);
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

        this.log.debug(`tidal.js: window ${id} removed from ${item.workspace}, ${item.monitor}`);
    }

    initWorkspace(workspace) {
        if (workspace !== undefined && workspace !== null) {
            this.log.debug(`tidal.js: initializing workspace ${workspace}`);
            global.workspace_manager.get_workspace_by_index(workspace).connect("window-added", (ws, w) => this.windowAdded(ws, w));
            global.workspace_manager.get_workspace_by_index(workspace).connect("window-removed", (ws, w) => this.windowRemoved(ws, w));
        } else {
            for (var i = 0; i < global.workspace_manager.get_n_workspaces(); i++) {
                this.initWorkspace(i);
            }
        }
    }

    refreshWorkspace() {
        let workspace = global.workspace_manager.get_active_workspace();
        let index = workspace.index();

        for (var monitor = 0; monitor < workspace.get_display().get_n_monitors(); monitor++) {
            this.pool.execute(index, monitor);
        }

        this.setWindowOpacities();
    }

    updateWindowBorders(conf) {
        if (conf) {
            if (conf.color)
                this.activeHighlight.color = conf.color;
            if (conf.width !== undefined)
                this.activeHighlight.width = conf.width;
            if (conf.top !== undefined)
                this.activeHighlight.top = conf.top;
            if (conf.right !== undefined)
                this.activeHighlight.right = conf.right;
            if (conf.bottom !== undefined)
                this.activeHighlight.bottom = conf.bottom;
            if (conf.left !== undefined)
                this.activeHighlight.left = conf.left;
        }
    }

    increaseHorizontalSplit() {
        if (this.pool.increaseHorizontalSplit) {
            this.pool.increaseHorizontalSplit(this.getActiveWindow());
        }
    }

    decreaseHorizontalSplit() {
        if (this.pool.decreaseHorizontalSplit) {
            this.pool.decreaseHorizontalSplit(this.getActiveWindow());
        }
    }

    increaseVerticalSplit() {
        if (this.pool.increaseVerticalSplit) {
            this.pool.increaseVerticalSplit(this.getActiveWindow());
        }
    }

    decreaseVerticalSplit() {
        if (this.pool.decreaseVerticalSplit) {
            this.pool.decreaseVerticalSplit(this.getActiveWindow());
        }
    }

    selectWindow(direction) {
        let active = this.getActiveWindow();
        if (!active)
            return;

        let rect = active.get_frame_rect();
        let gaps = this.settings.get_int("window-gaps");
        let scale = active.get_display().get_monitor_scale(active.get_monitor()) * 2;

        let offset = (gaps * scale) + (scale * 2);

        if (direction.above) {
            rect.y -= offset;
        } else if (direction.below) {
            rect.y += offset;
        } else if (direction.left) {
            rect.x -= offset;
        } else if (direction.right) {
            rect.x += offset;
        }

        active.get_workspace().list_windows().forEach(window => {
            if (window !== active) {
                let otherOffset = this.getWorkspaceOffsets(window);
                let other = window.get_frame_rect();

                if (direction && direction.left) {
                    other.x += otherOffset.horizontalOffset;
                    other.width += 2 * otherOffset.horizontalOffset;
                } else if (direction && direction.right) {
                    other.x -= otherOffset.horizontalOffset;
                    other.width += 2 * otherOffset.horizontalOffset;
                } else if (direction && direction.below) {
                    other.y -= otherOffset.verticalOffset;
                    other.height += 2 * otherOffset.verticalOffset;
                } else if (direction && direction.above) {
                    other.y -= otherOffset.verticalOffset;
                    other.height += 2 * otherOffset.verticalOffset;
                }

                if (rect.overlap(other)) {
                    this.log.debug(`${active.get_id()} has a neighbor ${window.get_id()}`);
                    window.focus(0);
                }
            }
        });
    }

    getWorkspaceOffsets(window) {
        let rect = window.get_frame_rect();
        let monitorWorkArea =
            window.get_workspace()
            .get_work_area_for_monitor(window.get_monitor());
        let monitorGeometry = global.display.get_monitor_geometry(window.get_monitor());
        let scale = window.get_display().get_monitor_scale(window.get_monitor());

        let verticalOffset = (monitorGeometry.height - monitorWorkArea.height);
        let horizontalOffset = (monitorGeometry.width - monitorWorkArea.width);

        return {
            horizontalOffset,
            verticalOffset
        };
    }
}
