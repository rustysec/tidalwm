const Meta = imports.gi.Meta;

const HORIZONTAL = 0;
const VERTICAL = 1;

var Spiral = class SpiralClass {
    constructor(settings) {
        this.settings = settings;
        this.windows = {};
    }

    // adds a window to this spiral group
    addWindow(window) {
        if (window) {
            let id = window.get_id();
            let workspace = window.get_workspace().index();
            let monitor = window.get_monitor();

            log(`spiral.js: adding window ${window.get_id()} to spiral ${workspace}, ${monitor}`);
            this.windows[id] = {
                id: window.get_id(),
                window,
                workspace,
                monitor,
                order: Object.values(this.windows).filter(
                    w => w.window.get_workspace().index() === workspace &&
                    w.window.get_monitor() === monitor
                ).length,
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
    updateWindow(window) {
        if (window) {
            let id = window.get_id();
            log(`spiral.js: updating window ${id}`);

            let filtered = this.windows[id];
            if (filtered) {
                let newWorkspace = window.get_workspace().index();
                let newMonitor = window.get_monitor();
                let { workspace, monitor } = filtered;
                log(`spiral.js: moving window ${id} from spiral ${workspace}, ${monitor} to ${newWorkspace}, ${newMonitor}`);

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
            .filter(item => item.workspace === workspace && item.monitor === monitor)
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

            item.window.move_resize_frame(true,
                item.lastSize.x,
                item.lastSize.y,
                item.lastSize.width,
                item.lastSize.height,
            );
        }
    }

    getSortedWindows(workspace, monitor) {
        return Object.values(this.windows)
            .filter(item => item.workspace === workspace && item.monitor === monitor)
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

        let smartGaps = this.settings.get_boolean("smart-gaps");

        let gaps = (smartGaps && this.windows.length == 1) ? 0 :
            this.settings.get_int("window-gaps") *
            global.workspace_manager.get_workspace_by_index(workspace)
                .get_display()
                .get_monitor_scale(monitor);

        let ws = global.workspace_manager.get_workspace_by_index(workspace);
        let work_area = ws.get_work_area_for_monitor(monitor);

        work_area.x = work_area.x + gaps;
        work_area.y = work_area.y + gaps;
        work_area.width = work_area.width - (gaps * 2);
        work_area.height = work_area.height - (gaps * 2);

        let direction = this.settings.get_int("initial-direction");

        this.cacheWindows();
        let windows = this.getSortedWindows(workspace, monitor);
        log(`spiral.js: executing on ${workspace}, ${monitor} with ${windows.length} windows`);

        for (var i = 0; i < windows.length; i++) {
            windows[i].window.unmaximize(Meta.MaximizeFlags.BOTH);
            windows[i].lastSize = {
                x: work_area.x,
                y: work_area.y,
                width: work_area.width,
                height: work_area.height
            };

            if (windows.length > 1) {
                // needs bisecting
                if (direction == HORIZONTAL) {
                    let new_width = (work_area.width / 2) - (gaps / 2);
                    windows[i].lastSize.x = work_area.x;
                    windows[i].lastSize.y = work_area.y;
                    windows[i].lastSize.width =
                        (i < windows.length -1) ? new_width : work_area.width;
                    windows[i].lastSize.height = work_area.height;

                    // adjust for the next window
                    work_area.x = work_area.x + gaps + new_width;
                    work_area.width = new_width;
                } else {
                    let new_height = (work_area.height / 2) - (gaps / 2);
                    windows[i].lastSize.x = work_area.x;
                    windows[i].lastSize.y = work_area.y;
                    windows[i].lastSize.width = work_area.width;
                    windows[i].lastSize.height = 
                        (i < windows.length - 1) ? new_height : work_area.height;

                    // adjust for the next window
                    work_area.y = work_area.y + gaps + new_height;
                    work_area.height = new_height;
                }
                direction = direction ? 0 : 1;
            }

            // for some reason this really helps with ensuring the window ends up
            // in the right position, especially if there are other windows opening
            // and closing at the same time. also seems to help with fuzzy fonts
            // appearing in multi-dpi environments.
            let self = windows[i];
            let tmpResize = windows[i].window.connect("size-changed", (window) => {
                self.window.disconnect(tmpResize);
                self.window.move_resize_frame(true,
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
        let {workspace, monitor} = global.get_window_actors().filter(actor => {
            let meta = actor.get_meta_window();
            return meta && meta.get_window_type() == 0 && meta.appears_focused;
        })[0];

        let tmpWindows = this.windows.reverse();
        for (var i = 0; i < tmpWindows.length; i++) {
            if (i == 0) {
                tmpWindows[i].order = 0;
            } else {
                tmpWindows[i].order += 1;
            }
        }
        this.windows = tmpWindows;
        this.resetOrdering(workspace, monitor);
        this.execute(workspace, monitor);
    }
}
