const Meta = imports.gi.Meta;

const HORIZONTAL = 0;
const VERTICAL = 1;

const WINDOW = 0;
const CONTAINER = 1;

class Container {
    constructor(window, isRoot) {
        log(`swayi3.js; creating new container for ${window.get_id()}`);
        this.window = window;
        this.children = [];
        this.direction = HORIZONTAL;
        this.active = true;
        this.root = isRoot || false;
    }

    refresh() {
        if (this._window && this._window.get_workspace()) {
            this._monitor = this._window.get_monitor();
            this._workspace = this._window.get_workspace() && window.get_workspace().index();
        }
    }

    addWindow(window) {
        if (this.active && this.window) {
            this.children.push(new Container(this.window));
            this.window = null;
        }
        this.children.push(new Container(window));
    }

    workspaceAndMonitor() {
        if (this.window && this.window.get_workspace() !== null) {
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

    mapInto(workArea, gaps, smartGaps) {
        log(`mapInto()`);
        if (this.window) {
            if (this.root) {
                this.window.move_resize_frame(true,
                    workArea.x + gaps,
                    workArea.y + gaps,
                    workArea.width - (gaps * 2),
                    workArea.height - (gaps * 2),
                );
            } else {
                this.window.move_resize_frame(true,
                    workArea.x,
                    workArea.y,
                    workArea.width,
                    workArea.height
                );
            }
        } else {
            log(`do the things!`);

            workArea.height -= gaps * 2;
            workArea.width -= gaps * 2;
            workArea.x += gaps;
            workArea.y += gaps;

            let width = this.direction === HORIZONTAL ? (workArea.width - (gaps * (this.children.length - 1))) / this.children.length : workArea.width;
            let height = this.direction === VERTICAL ? (workArea.height - (gaps * (this.children.length - 1))) / this.children.length : workArea.height;

            for (var i = 0; i < this.children.length; i++) {
                if (this.direction === HORIZONTAL) {
                    let newArea = {
                        x: workArea.x + (i * (width + gaps)),
                        y: workArea.y,
                        width: width,
                        height: height
                    };
                    this.children[i].mapInto(newArea, gaps, smartGaps);
                } else {
                    let newArea = {
                        x: workArea.x,
                        y: workArea.y + (i * (height + gaps)),
                        width: width,
                        height: height
                    };
                    this.children[i].mapInto(newArea, gaps, smartGaps);
                }
            }
        }
    }

    prune() {
        log(`pruning`);
        if (this.window) {
            log(`found a window? ${this.window.get_workspace()}`);
            if (this.window.get_workspace() === null) {
                log(`found a dead one`);
                this.window = null;
                return true;
            } else {
                return false;
            }
        } else {
            for (var i=0; i < this.children.length; i++) {
                this.children[i].prune();
            }

            this.children = this.children.filter(child => child.window || child.children.length);
            log(`now have ${this.children.length} children`);

            if (this.children.length === 1) {
                log(`setting myself as a window container now`);
                this.window = this.children[0].window;
                this.children = [];
            }
        }
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
        log(`swayi3.js: add window ${window.get_id()}`);

        let workspace = window.get_workspace().index();
        let monitor = window.get_monitor();

        let container = this.getRootContainer(workspace, monitor);

        if (!container) {
            log(`have to create new container...`);
            container = new Container(window, true);
            this.containers.push(container);
        } else {
            log(`adding to existing container`);
            container.addWindow(window);
        }

        this.windows[window.get_id()] = {
            monitor: window.get_monitor(),
            workspace: window.get_workspace().index()
        };

        this.execute(workspace, monitor);
    }

    getNextContainerId() {
    }

    removeWindow(window) {
        if (window) {
            let id = window.get_id();
            this.log.log(`removing window: ${id}`);
            if (this.windows[id]) {
                let { monitor, workspace } = this.windows[id];
                let root = this.getRootContainer(monitor, workspace);
                if (root) {
                    root.prune();
                    this.execute(workspace, monitor);
                }
            } else {
                log(`can't find this window?`);
            }
        }
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

        this.log.debug(`swayi3.js: executing on ${workspace}, ${monitor}`);

        if (!root) {
            root = new Container();
        }

        root.mapInto(workArea, gaps, smartGaps);
    }

    getRootContainer(ws, mon) {
        log(`get root container ws = ${ws}, mon = ${mon}`);

        return this.containers.filter(container => {
            let wsAndMon = container.workspaceAndMonitor();
            if (wsAndMon) {
                let {workspace, monitor} = wsAndMon;
                log(`checking a container workspace = ${workspace}, monitor = ${monitor} ...`);
                return workspace === ws && monitor === mon;
            } else {
                return false;
            }
        })[0] || null;
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
