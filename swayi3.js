const Meta = imports.gi.Meta;

const HORIZONTAL = 0;
const VERTICAL = 1;

const WINDOW = 0;
const CONTAINER = 1;

class Container {
    constructor(window, isRoot) {
        log(`swayi3.js: creating new container for ${window.get_id()}`);
        this.window = window;
        this.children = [];
        this.direction = HORIZONTAL;
        this.root = isRoot || false;
    }

    refresh() {
        if (this._window && this._window.get_workspace()) {
            this._monitor = this._window.get_monitor();
            this._workspace = this._window.get_workspace() && window.get_workspace().index();
        }
    }

    addWindow(window, active) {
        if (!active) {
            log(`no active window?`);
            if (this.window) {
                log(`was window, now making a new container`);
                this.children.push(new Container(this.window));
                this.window = null;
            }
            this.children.push(new Container(window));
            return true;
        } else {
            if (this.window) {
                log(`looking in a windowed container ${this.window.get_id()} vs ${active.get_id()}?`);
                if (this.window.get_id() === active.get_id()) {
                    log(`found it here, in the windowed container!`);
                    this.children.push(new Container(this.window));
                    this.children.push(new Container(window));
                    this.window = null;
                    return true;
                } else {
                    log(`they didn't match`);
                    return false;
                }
            } else {
                log(`looking in a container container`);
                // check all the children to see if they are windows, match active if possible
                for (var i = 0; i < this.children.length; i++) {
                    log(`checking child ${i}`);
                    if (this.children[i].window && this.children[i].window.get_id() === active.get_id()) {
                        this.children.push(new Container(window));
                        return true;
                    }
                }
                // otherwise, we need to traverse the tree
                for (var i = 0; i < this.children.length; i++) {
                    log(`try to force add to child ${i}`);
                    if (this.children[i].addWindow(window, active)) {
                        return true;
                    }
                }
                // if all else fails
                return false;
            }
        }
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

    setDirectionForContainerOf(window, direction) {
        if (this.window) {
            if (this.window.get_id() === window.get_id()) {
                log(`found the active container for ${window.get_id()}`);
                this.direction = direction;
                return true;
            } else {
                return false;
            }
        } else {
            log(`checking my kids`);
            for (var i = 0; i < this.children.length; i++) {
                if (this.children[i].window && this.children[i].window.get_id() === window.get_id()) {
                    this.children[i].direction = direction;
                    this.children[i].children.push(new Container(this.children[i].window));
                    this.children[i].window = null;
                    return true;
                }
            }
        }
       
        // last ditch effort
        for (var i=0; i < this.children.length; i++) {
            if (this.children[i].setDirectionForContainerOf(window, direction)) {
                return true;
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
        this.activeWindows = [];
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
            container.addWindow(window, this.getActiveWindowFor(window));
        }

        this.windows[window.get_id()] = {
            monitor: window.get_monitor(),
            workspace: window.get_workspace().index()
        };

        this.cacheActiveWindow(window);

        this.execute(workspace, monitor);
    }

    getNextContainerId() {
    }

    pruneContainers() {
        this.containers = this.containers.filter(container => container.workspaceAndMonitor());
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
            this.pruneContainers();
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
        this.cacheActiveWindow(window);
        this.log.log(`swayi3.js: active window is ${window.get_id()}`);
        let root = this.getRootContainer(window.get_workspace().index(), window.get_monitor());
        if (root) {
            root.setDirectionForContainerOf(window, VERTICAL);
        }
        this.execute(window.get_workspace().index(), window.get_monitor());
    }

    hsplitContainer() {
        this.log.log(`swayi3.js: hsplitContainer()`);
        let window = this.getActiveWindow();
        this.cacheActiveWindow(window);
        this.log.log(`swayi3.js: active window is ${window.get_id()}`);
        let root = this.getRootContainer(window.get_workspace().index(), window.get_monitor());
        if (root) {
            root.setDirectionForContainerOf(window, HORIZONTAL);
        }
        this.execute(window.get_workspace().index(), window.get_monitor());
    }

    splitWindow(window, direction) {
        if (!window && !this.windows[window.get_id()])
            return;

        this.log.log(`swayi3.js: splitting window ${window.get_id()}`);
    }

    setActiveContainer(containerId, workspace, monitor) {

    }

    setFocusedWindow(window) {
        log(`swayi3.js: focus changed`);
        this.cacheActiveWindow(window);
    }

    cacheActiveWindow(active) {
        this.activeWindows = this.activeWindows.filter(window => {
            if (window && window.get_workspace() !== null) {
                return window.get_monitor() !== active.get_monitor() &&
                    window.get_workspace().index() !== active.get_workspace().index();
            } else {
                return false;
            }
        });
        this.activeWindows.push(active);
    }

    getActiveWindowFor(window) {
        let active = this.activeWindows.filter(active => {
            if (active && active.get_workspace() !== null) {
                return active.get_monitor() === window.get_monitor() &&
                    active.get_workspace().index() ===
                    window.get_workspace().index();
            } else {
                return false;
            }
        });

        if (active) {
            return active[0];
        } else {
            return null;
        }
    }
}
