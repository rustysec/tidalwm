const Meta = imports.gi.Meta;

const HORIZONTAL = 0;
const VERTICAL = 1;

const WINDOW = 0;
const CONTAINER = 1;

class Container {
    constructor(window) {
        log(`swayi3.js; creating new container for ${window.get_id()}`);
        this.window = window;
        this.children = [];
        this.type = CONTAINER;
        this.direction = HORIZONTAL;
        this.active = true;
    }

    refresh() {
        if (this._window && this._window.get_workspace()) {
            this._monitor = this._window.get_monitor();
            this._workspace = this._window.get_workspace() && window.get_workspace().index();
        }
    }

    addWindow(window) {
        if (this.active && this.winodw) {
            this.children.push(new Container(this.window));
            this.window = null;
        }
        this.children.push(new Container(window));
    }

    workspaceAndMonitor() {
        if (this.window) {
            log(`swayi3.js: this is a window container`);
            return {
                workspace: this.window.get_workspace().index(),
                monitor: this.window.get_monitor()
            }
        } else {
            for (var i = 0; i < this.children.length; i++) {
                let result = this.children[i].workspaceAndMonitor();
                if (result) {
                    return result;
                }
            }
        }
    }

    mapInto(workArea) {
        log(`mapInto()`);
    }
}

var Swayi3 = class Swayi3Class {
    constructor(settings, logging, getActiveWindow) {
        this.settings = settings;
        this.log = logging;
        this.containers = [];
        this.windows = {};
        this.getActiveWindow = getActiveWindow;
    }

    addWindow(window) {
        log(`swayi3.js: add window {window.get_id()}`);

        let workspace = window.get_workspace().index();
        let monitor = window.get_monitor();

        let container = this.getRootContainer(workspace, monitor);

        if (!container) {
            container = new Container(window);
            this.containers.push(container);
        }

        this.execute(workspace, monitor);
    }

    getNextContainerId() {
    }

    removeWindow(window) {
    }

    updateWindow(window) {
        // todo
    }

    resetWindow(window) {
        // todo
    }

    rotateWindows() {
        // todo
    }

    dragWindow(window) {
        // todo
    }

    rotateWindows() {
        // todo
    }

    increaseHorizontalSplit(window) {
        if (!window || !this.windows[window.get_id()])
            return;
    }

    decreaseHorizontalSplit(window) {
        if (!window || !this.windows[window.get_id()])
            return;
    }

    increaseVerticalSplit(window) {
        if (!window || !this.windows[window.get_id()])
            return;
    }

    decreaseVerticalSplit(window) {
        if (!window || !this.windows[window.get_id()])
            return;
    }

    execute(workspace, monitor) {
        log(`swayi3.js: execute(${workspace}, ${monitor})`);
        let root = this.getRootContainer(workspace, monitor);
        let smartGaps = this.settings.get_boolean("smart-gaps");

        let gaps = this.settings.get_int("window-gaps") *
            global.workspace_manager.get_workspace_by_index(workspace)
                .get_display()
                .get_monitor_scale(monitor);

        let ws = global.workspace_manager.get_workspace_by_index(workspace);
        let workArea = ws.get_work_area_for_monitor(monitor);

        /*
        workArea.x = workArea.x + gaps;
        workArea.y = workArea.y + gaps;
        workArea.width = workArea.width - (gaps * 2);
        workArea.height = workArea.height - (gaps * 2);
        */

        this.log.debug(`swayi3.js: executing on ${workspace}, ${monitor}`);

        if (!root) {
            root = new Container();
        }

        root.mapInto(workArea, gaps, smartGaps);
    }

    getRootContainer(ws, mon) {
        log(`get root container ws = ${ws}, mon = ${mon}`);

        return this.containers.filter(container => {
            let {workspace, monitor} = container.workspaceAndMonitor();
            log(`checking a container workspace = ${workspace}, monitor = ${monitor} ...`);
            return workspace === ws && monitor === mon;
        })[0] || null;
    }

    mapWindowsIntoWorkArea(container, workArea, workspace, monitor) {
        if (!container)
            return;

        let smartGaps = this.settings.get_boolean("smart-gaps");
        let gaps = (smartGaps && containers.length == 1) ? 0 :
            this.settings.get_int("window-gaps") *
            global.workspace_manager.get_workspace_by_index(workspace)
                .get_display()
                .get_monitor_scale(monitor);

        this.log.log(`swayi3.js: mapping container ${container.id} into ${JSON.stringify(workArea)}`);

        let length = (container.children && container.children.length) || 1;

        let x_y = container.direction == HORIZONTAL ? workArea.x : workArea.y;
        let h_w = container.direction == HORIZONTAL ?
                (workArea.width - ((length - 1) * gaps)) / length :
                (workArea.height - ((length - 1) * gaps)) / length;


        for (var i = 0; i < length; i++) {
            let geometry = {};

            if (container.direction == HORIZONTAL) {
                geometry = {
                    x: x_y,
                    y: workArea.y,
                    width: h_w,
                    height: workArea.height
                };
            } else {
                geometry = {
                    x: workArea.x,
                    y: x_y,
                    width: workArea.width,
                    height: h_w
                };
            }

            if (container.type == WINDOW) {
                this.log.log(`swayi3.js: mapping in window to ${JSON.stringify(geometry)}`);
                container.window.move_resize_frame(true,
                    geometry.x,
                    geometry.y,
                    geometry.width,
                    geometry.height
                );
            } else {
                // map sub-containers into this space
                this.log.log(`swayi3.js: mapping in sub-container`);
                if (container.children && container.children[i]) {
                    this.mapWindowsIntoWorkArea(container.children[i], geometry, workspace, monitor);
                }
            }

            x_y += gaps + h_w;
        }
    }

    vsplitContainer() {
        this.log.log(`swayi3.js: vsplitContainer()`);
        let window = this.getActiveWindow();
        this.log.log(`swayi3.js: active window is ${window.get_id()}`);
    }

    hsplitContainer() {
        this.log.log(`swayi3.js: hsplitContainer()`);
        let window = this.getActiveWindow();
        this.log.log(`swayi3.js: active window is ${window.get_id()}`);
    }

    splitWindow(window, direction) {
        if (!window && !this.windows[window.get_id()])
            return;

        this.log.log(`swayi3.js: splitting window ${window.get_id()}`);
    }

    setActiveContainer(containerId, workspace, monitor) {

    }
}
