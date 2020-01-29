const Meta = imports.gi.Meta;

const HORIZONTAL = 0;
const VERTICAL = 1;

var Spiral = class SpiralClass {
    constructor(settings, workspace, monitor) {
        this.settings = settings;
        this.workspace = workspace;
        this.monitor = monitor;
        this.windows = [];
    }

    getEffectiveMonitor() {
        if (this.windows[0]) {
            this.monitor = this.windows[0].window.get_monitor();
            return this.windows[0].window.get_monitor();
        } else {
            return null;
        }
    }

    getEffectiveWorkspace() {
        if (this.windows[0]) {
            this.workspace = this.windows[0].window.get_workspace();
            return this.windows[0].window.get_workspace().index();
        } else {
            return null;
        }
    }

    // adds a window to this spiral group
    addWindow(window) {
        if (window) {
            log(`adding window ${window.get_id()} to spiral ${this.workspace}, ${this.monitor}`);
            this.windows.push({
                window,
                order: this.windows.length
            });
        }
        this.spiralWindows();
    }

    // removes a window from this spiral group
    removeWindow(window) {
        if (window) {
            log(`removing window ${window.get_id()} from spiral ${this.workspace}, ${this.monitor}`);
            this.windows = this.windows.filter(item => item.window.get_id() != window.get_id());
        }
        this.resetOrdering();
        this.spiralWindows();
    }

    // zero index the ordering and make sure it's contiguous 
    resetOrdering() {
        this.windows.sort((a, b) => {
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
        let item = this.windows.filter(item => item.window.get_id() == window.get_id())[0];
        if (item) {
            item.window.move_resize_frame(true,
                item.lastSize.x,
                item.lastSize.y,
                item.lastSize.width,
                item.lastSize.height,
            );
        }
    }

    // take the windows being managed together and places them via the spiral
    // algorithm
    spiralWindows() {
        if (!this.windows || !this.windows.length) {
            return;
        }

        let smartGaps = this.settings.get_boolean("smart-gaps");

        let gaps = (smartGaps && this.windows.length == 1) ? 0 :
            this.settings.get_int("window-gaps") *
            global.workspace_manager.get_workspace_by_index(this.workspace)
                .get_display()
                .get_monitor_scale(this.monitor);

        let workspace = global.workspace_manager.get_workspace_by_index(this.workspace);
        let work_area = workspace
            .get_work_area_for_monitor(this.monitor);

        work_area.x = work_area.x + gaps;
        work_area.y = work_area.y + gaps;
        work_area.width = work_area.width - (gaps * 2);
        work_area.height = work_area.height - (gaps * 2);

        let direction = this.settings.get_int("initial-direction");

        for (var i = 0; i < this.windows.length; i++) {
            this.windows[i].window.unmaximize(Meta.MaximizeFlags.BOTH);
            this.windows[i].lastSize = {
                x: work_area.x,
                y: work_area.y,
                width: work_area.width,
                height: work_area.height
            };

            if (this.windows.length > 1) {
                // needs bisecting
                if (direction == HORIZONTAL) {
                    let new_width = (work_area.width / 2) - (gaps / 2);
                    this.windows[i].lastSize.x = work_area.x;
                    this.windows[i].lastSize.y = work_area.y;
                    this.windows[i].lastSize.width =
                        (i < this.windows.length -1) ? new_width : work_area.width;
                    this.windows[i].lastSize.height = work_area.height;

                    // adjust for the next window
                    work_area.x = work_area.x + gaps + new_width;
                    work_area.width = new_width;
                } else {
                    let new_height = (work_area.height / 2) - (gaps / 2);
                    this.windows[i].lastSize.x = work_area.x;
                    this.windows[i].lastSize.y = work_area.y;
                    this.windows[i].lastSize.width = work_area.width;
                    this.windows[i].lastSize.height = 
                        (i < this.windows.length - 1) ? new_height : work_area.height;

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
            let self = this.windows[i];
            let tmpResize = this.windows[i].window.connect("size-changed", (window) => {
                self.window.disconnect(tmpResize);
                self.window.move_resize_frame(true,
                    self.lastSize.x,
                    self.lastSize.y,
                    self.lastSize.width,
                    self.lastSize.height,
                );
            });

            this.windows[i].window.move_resize_frame(true,
                this.windows[i].lastSize.x,
                this.windows[i].lastSize.y,
                this.windows[i].lastSize.width / 2,
                this.windows[i].lastSize.height / 2,
            );
        }
    }

    // rotates windows through the spiral. what is in the last position 
    // is moved to the first and everything is shifted one position over.
    rotateWindows() {
        let tmpWindows = this.windows.reverse();
        for (var i = 0; i < tmpWindows.length; i++) {
            if (i == 0) {
                tmpWindows[i].order = 0;
            } else {
                tmpWindows[i].order += 1;
            }
        }
        this.windows = tmpWindows;
        this.resetOrdering();
        this.spiralWindows();
    }
}
