const Meta = imports.gi.Meta;

const HORIZONTAL = 0;
const VERTICAL = 1;

const WINDOW = 0;
const CONTAINER = 1;

const Mainloop = imports.mainloop;

const setTimeout = function(func, millis /* , ... args */) {

    let args = [];
    if (arguments.length > 2) {
        args = args.slice.call(arguments, 2);
    }
 
    let id = Mainloop.timeout_add(millis, () => {
        func.apply(null, args);
        return false; // Stop repeating
    }, null);

    return id;
};

class Container {
    constructor(window, isRoot) {
        if (window) {
            this.log.debug(`swayi3.js: creating new container for ${window.get_id()}`);
            this.window = window;
        }
        this.children = [];
        this.direction = HORIZONTAL;
        this.root = isRoot || false;
    }

    addWindow(window, active) {
        if (!active) {
            if (this.window) {
                this.children.push(new Container(this.window));
                this.window = null;
            }
            this.children.push(new Container(window));
            return true;
        } else {
            if (this.window) {
                if (this.window.get_id() === active.get_id()) {
                    this.children.push(new Container(this.window));
                    this.children.push(new Container(window));
                    this.window = null;
                    return true;
                } else {
                    return false;
                }
            } else {
                // check all the children to see if they are windows, match active if possible
                for (var i = 0; i < this.children.length; i++) {
                    if (this.children[i].window && this.children[i].window.get_id() === active.get_id()) {
                        this.children.push(new Container(window));
                        return true;
                    }
                }
                // otherwise, we need to traverse the tree
                for (var i = 0; i < this.children.length; i++) {
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
            return null;
        }
    }

    mapInto(workArea, gaps, smartGaps) {
        if (this.window) {
            let newSize = {};

            if (this.root) {
                newSize.x = workArea.x + gaps;
                newSize.y = workArea.y + gaps;
                newSize.width = workArea.width - (gaps * 2);
                newSize.height = workArea.height - (gaps * 2);
            } else {
                newSize.x = workArea.x;
                newSize.y = workArea.y;
                newSize.width = workArea.width;
                newSize.height = workArea.height
            }

            this.window.move_resize_frame(true,
                newSize.x,
                newSize.y,
                newSize.width,
                newSize.height
            );
        } else {
            if (this.root || (!this.children.some(child => child.window || child.children.length === 1))) {
                workArea.height -= gaps * 2;
                workArea.width -= gaps * 2;
                workArea.x += gaps;
                workArea.y += gaps;
            }

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
        if (this.window) {
            if (this.window.get_workspace() === null) {
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

            if (this.children.length === 1 && this.children[0].window) {
                this.window = this.children[0].window;
                this.children = [];
            }
        }
    }

    setDirectionForContainerOf(window, direction) {
        if (this.window) {
            if (this.window.get_id() === window.get_id()) {
                this.direction = direction;
                return true;
            } else {
                return false;
            }
        } else {
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
        this.log.debug(`swayi3.js: add window ${window.get_id()}`);

        if (window.get_maximized()) {
            window.unmaximize(Meta.MaximizeFlags.BOTH);
        }

        let workspace = window.get_workspace().index();
        let monitor = window.get_monitor();

        let container = this.getRootContainer(workspace, monitor);

        if (!container) {
            container = new Container(window, true);
            this.containers.push(container);
        } else {
            container.addWindow(window, this.getActiveWindowFor(window));
        }

        this.windows[window.get_id()] = {
            monitor: window.get_monitor(),
            workspace: window.get_workspace().index()
        };


        this.execute(workspace, monitor);

        this.cacheActiveWindow(window);

        // this is more or less a hack at the moment
        setTimeout(() => {
            this.execute(workspace, monitor);
        }, 200);
    }

    pruneContainers() {
        this.containers = this.containers.filter(container => container.workspaceAndMonitor());
    }

    removeWindow(window) {
        if (window) {
            let id = window.get_id();
            if (this.windows[id]) {
                let { monitor, workspace } = this.windows[id];
                let root = this.getRootContainer(monitor, workspace);
                if (root) {
                    root.prune();
                    this.execute(workspace, monitor);
                }
                delete this.windows[id];
            } 
            this.pruneContainers();
        }
    }

    updateWindow(window) {
        // todo
    }

    resetWindow(window) {
        if (window && window.get_workspace()) {
            this.execute(
                window.get_workspace().index(),
                window.get_monitor()
            );
        }
    }

    dragWindow(window) {
        // todo
        if (window && window.get_workspace()) {
            this.execute(window.get_workspace().index(), window.get_monitor());
        }
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
        this.log.debug(`swayi3.js: execute(${workspace}, ${monitor})`);
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
        return this.containers.filter(container => {
            let wsAndMon = container.workspaceAndMonitor();
            if (wsAndMon) {
                let {workspace, monitor} = wsAndMon;
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
            root.setDirectionForContainerOf(window, HORIZONTAL);
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
            root.setDirectionForContainerOf(window, VERTICAL);
        }
        this.execute(window.get_workspace().index(), window.get_monitor());
    }

    setFocusedWindow(window) {
        this.log.debug(`swayi3.js: focus changed`);
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
            let workspace = active.get_workspace();
            if (active && workspace !== null && workspace !== undefined) {
                return active.get_monitor() === window.get_monitor() &&
                    active.get_workspace().index() ===
                    window.get_workspace().index();
            } else {
                return false;
            }
        });

        if (active && active[0]) {
            return active[0];
        } else {
            return null;
        }
    }
}
