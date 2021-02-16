const Meta = imports.gi.Meta;

const HORIZONTAL = 0;
const VERTICAL = 1;

var Spiral = class SpiralClass {
    constructor(settings, logging) {
        this.settings = settings;
        this.log = logging;
        this.windows = {};
    }

    // adds a window to this spiral group
    addWindow(window) {
        if (window) {
            let id = window.get_id();
            let workspace = window.get_workspace().index();
            let monitor = window.get_monitor();

            this.log.log(`spiral.js: adding window ${window.get_id()} to spiral ${workspace}, ${monitor}`);
            this.windows[id] = {
                id: window.get_id(),
                window,
                workspace,
                monitor,
                order: Object.values(this.windows).filter(
                    w => w.window.get_workspace().index() === workspace &&
                    w.window.get_monitor() === monitor
                ).length,
                hSplit: 0,
                vSplit: 0,
            };

            this.resetOrdering(workspace, monitor);
            this.execute(workspace, monitor);
        }
    }

    cacheWindows() {
        Object.values(this.windows).forEach(window => {
            window.workspace = window.window.get_workspace().index();
            window.monitor = window.window.get_monitor();
        });
    }

    // removes a window from this spiral group
    removeWindow(window) {
        let id = window.get_id();

        if (this.windows[id]) {
            let { workspace, monitor } = this.windows[id];
            delete this.windows[id];
            this.resetOrdering(workspace, monitor);
            this.execute(workspace, monitor);
        }
    }

    // calculate where a window is vs where it was, update both
    updateWindow(window) {
        if (window && !window.minimized) {
            let id = window.get_id();
            this.log.log(`spiral.js: updating window ${id}`);

            let filtered = this.windows[id];
            if (filtered) {
                let newWorkspace = window.get_workspace().index();
                let newMonitor = window.get_monitor();
                let { workspace, monitor } = filtered;
                this.log.debug(`spiral.js: moving window ${id} from spiral ${workspace}, ${monitor} to ${newWorkspace}, ${newMonitor}`);

                filtered.monitor = newMonitor;
                filtered.workspace = newWorkspace;

                this.resetOrdering(newWorkspace, newMonitor);
                this.execute(newWorkspace, newMonitor);

                this.resetOrdering(workspace, monitor);
                this.execute(workspace, monitor);
            }
        }
    }

    // zero index the ordering and make sure it's contiguous 
    resetOrdering(workspace, monitor) {
        Object.values(this.windows)
            .filter(item => item.workspace === workspace && item.monitor === monitor && !item.window.minimized)
            .sort((a, b) => {
                if (a.order > b.order) return 1;
                if (a.order < b.order) return -1;
                return 0;
            })
            .forEach((item, index) => {
                item.order = index;
            });
    }

    // use the window's last known position and resize/reposition it
    resetWindow(window) {
        let item = this.windows[window.get_id()];
        if (item) {
            let workspace = window.get_workspace().index();
            let monitor = window.get_monitor();

            this.execute(workspace, monitor);
        }
    }

    getSortedWindows(workspace, monitor) {
        return Object.values(this.windows)
            .filter(item =>
                item.workspace === workspace &&
                item.monitor === monitor &&
                !item.window.minimized && 
                !item.window.is_fullscreen()
            )
            .sort((a, b) => {
                if (a.order > b.order) return 1;
                if (a.order < b.order) return -1;
                return 0;
            });
    }

    // take the windows being managed together and places them via the spiral
    // algorithm
    execute(workspace, monitor) {
        if (!this.windows || !Object.values(this.windows).length) {
            return;
        }

        let smartGaps = this.settings.get_boolean("smart-gaps") || !Object.values(this.windows).length;
        let smartGapsFullscreen = this.settings.get_boolean("smart-gaps-fullscreen");
        let scale = this.settings.get_boolean("ignore-scale") ? 1 :
            global.workspace_manager.get_workspace_by_index(workspace)
                .get_display()
                .get_monitor_scale(monitor);

        let gaps = (smartGaps && this.windows.length == 1) ? 0 :
            this.settings.get_int("window-gaps") * scale;

        let ws = global.workspace_manager.get_workspace_by_index(workspace);
        let work_area = ws.get_work_area_for_monitor(monitor);

        let direction = this.settings.get_int("initial-direction");

        this.cacheWindows();
        let windows = this.getSortedWindows(workspace, monitor);
        this.log.debug(`spiral.js: executing on ${workspace}, ${monitor} with ${windows.length} windows`);

        if (!smartGaps || windows.length > 1) {
            work_area.x = work_area.x + gaps;
            work_area.y = work_area.y + gaps;
            work_area.width = work_area.width - (gaps * 2);
            work_area.height = work_area.height - (gaps * 2);
        }

        for (var i = 0; i < windows.length; i++) {
            windows[i].window.unmaximize(Meta.MaximizeFlags.BOTH);
            windows[i].window.unmake_fullscreen();
            windows[i].lastSize = {
                x: work_area.x,
                y: work_area.y,
                width: work_area.width,
                height: work_area.height
            };

            // try to force the window to be visible
            let actor = windows[i].window.get_compositor_private();
            actor.show();

            if (windows.length > 1) {
                // needs bisecting
                if (direction == HORIZONTAL) {
                    let new_width = (work_area.width / 2) - (gaps / 2) + windows[i].hSplit;
                    if (i === 0) {
                        // Use different screen width for 1st window
                        let first_window_width_percent = this.settings.get_int('first-window-width-percent');
                        new_width = (work_area.width * first_window_width_percent / 100) - (gaps / 2) + windows[i].hSplit;
                    }
                    windows[i].lastSize.x = work_area.x;
                    windows[i].lastSize.y = work_area.y;
                    windows[i].lastSize.width = (i < windows.length - 1) ? new_width : work_area.width;
                    windows[i].lastSize.height = work_area.height;

                    // adjust for the next window
                    work_area.x = work_area.x + gaps + new_width;
                    work_area.width = work_area.width - new_width - gaps;
                } else {
                    let new_height = (work_area.height / 2) - (gaps / 2) + windows[i].vSplit;
                    windows[i].lastSize.x = work_area.x;
                    windows[i].lastSize.y = work_area.y;
                    windows[i].lastSize.width = work_area.width;
                    windows[i].lastSize.height = (i < windows.length - 1) ? new_height : work_area.height;

                    // adjust for the next window
                    work_area.y = work_area.y + gaps + new_height;
                    work_area.height = work_area.height - new_height - gaps;
                }
                direction = direction ? 0 : 1;
            }

            // for some reason this really helps with ensuring the window ends up
            // in the right position, especially if there are other windows opening
            // and closing at the same time. also seems to help with fuzzy fonts
            // appearing in multi-dpi environments.
            let self = windows[i];
            let tmpResize = windows[i].window.connect("size-changed", (window) => {
                window.disconnect(tmpResize);
                window.move_resize_frame(true,
                    self.lastSize.x,
                    self.lastSize.y,
                    self.lastSize.width,
                    self.lastSize.height,
                );
            });

            let tmpPosition = windows[i].window.connect("position-changed", (window) => {
                window.disconnect(tmpPosition);
                window.move_resize_frame(true,
                    self.lastSize.x,
                    self.lastSize.y,
                    self.lastSize.width,
                    self.lastSize.height,
                );
            });

            windows[i].window.move_resize_frame(true,
                windows[i].lastSize.x,
                windows[i].lastSize.y,
                windows[i].lastSize.width,
                windows[i].lastSize.height,
            );
        }
    }

    // rotates windows through the spiral. what is in the last position 
    // is moved to the first and everything is shifted one position over.
    rotateWindows() {
        let window = global.get_window_actors().filter(actor => {
            let meta = actor.get_meta_window();
            return meta && meta.get_window_type() == 0 && meta.appears_focused;
        });

        if (!window)
            return;

        window = window[0].get_meta_window();

        if (!window || !this.windows[window.get_id()])
            return;

        let {workspace, monitor} = this.windows[window.get_id()];
        this.log.debug(`spiral.js: rotating windows on ${workspace}, ${monitor}`);

        let tmpWindows = this.getSortedWindows(workspace, monitor).reverse();
        for (var i = 0; i < tmpWindows.length; i++) {
            if (i == 0) {
                tmpWindows[i].order = 0;
            } else {
                tmpWindows[i].order += 1;
            }
        }
        tmpWindows.forEach(window => {
            let id = window.window.get_id();
            this.log.debug(`spiral.js: rotating ${id} from ${this.windows[id].order} to ${window.order}`);
            this.windows[id].order = window.order;
        });

        this.resetOrdering(workspace, monitor);
        this.execute(workspace, monitor);
    }

    dragWindow(window) {
        if (!window || !this.windows[window.get_id()])
            return;

        let swapped = false;
        let draggingId = window.get_id();
        let dragging = this.windows[draggingId];

        let workspace = window.get_workspace();
        let [x, y, z] = global.get_pointer();

        let rect = new Meta.Rectangle({
            x, y,
            width: 1,
            height: 1,
        });

        let self = this;
        Object.values(this.windows).forEach(item => {
            if (item.window.get_frame_rect().contains_rect(rect)
                && item.window.get_id() != draggingId) {

                let underOrder = item.order;
                item.order = dragging.order;
                dragging.order = underOrder;

                this.execute(workspace.index(), window.get_monitor());
                self.swapped = true;
            }
        });

        if (!swapped)
            this.resetWindow(window);
    }

    increaseHorizontalSplit(window) {
        if (!window || !this.windows[window.get_id()])
            return;

        this.log.debug(`spiral.js: Increasing horizontal split of ${window.get_id()}`);
        this.windows[window.get_id()].hSplit += 10;
        this.execute(window.get_workspace().index(), window.get_monitor());

    }

    decreaseHorizontalSplit(window) {
        if (!window || !this.windows[window.get_id()])
            return;

        this.log.debug(`spiral.js: Decreasing horizontal split of ${window.get_id()}`);
        this.windows[window.get_id()].hSplit -= 10;
        this.execute(window.get_workspace().index(), window.get_monitor());
    }

    increaseVerticalSplit(window) {
        if (!window || !this.windows[window.get_id()])
            return;

        this.log.debug(`spiral.js: Increasing vertical split of ${window.get_id()}`);
        this.windows[window.get_id()].vSplit += 10;
        this.execute(window.get_workspace().index(), window.get_monitor());

    }

    decreaseVerticalSplit(window) {
        if (!window || !this.windows[window.get_id()])
            return;

        this.log.debug(`spiral.js: Decreasing vertical split of ${window.get_id()}`);
        this.windows[window.get_id()].vSplit -= 10;
        this.execute(window.get_workspace().index(), window.get_monitor());
    }
}
