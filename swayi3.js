const Meta = imports.gi.Meta;

const HORIZONTAL = 0;
const VERTICAL = 1;

var Swayi3 = class Swayi3Class {
    constructor(settings, logging) {
        this.settings = settings;
        this.log = logging;
        this.containers = {};
        this.windows = {};
    }

    addWindow(window) {
        this.windows[window.get_id()] = {
            monitor: window.get_monitor(),
            workspace: window.get_workspace().index()
        };

        let containers = this.getContainers(window.get_workspace().index(), window.get_monitor());
        if (containers.length == 0) {
            let id = this.getNextContainerId();
            this.log.log(`swayi3.js: adding window ${window.get_id()} to root container ${id}`);

            this.windows[window.get_id()].containerId = id;

            this.containers[id] = {
                id,
                windows: [ window ],
                children: null,
                parent: null,
                active: true,
                direction: VERTICAL,
                //direction: HORIZONTAL,
            };
        } else {
            let activeContainer = containers.filter(container => container.active)[0] || container[0];
            this.log.log(`swayi3.js: adding to active container ${activeContainer.id}`);

            if (activeContainer.windows) {
                activeContainer.windows.push(window);
                this.windows[window.get_id()].containerId = activeContainer.id;
            } else {
                let id = this.getNextContainerId();
                this.log.log(`swayi3.js: adding new container ${id}`);
                this.windows[window.get_id()].containerId = id;

                this.containers[id] = {
                    id,
                    windows: [ window ],
                    children: null,
                    parent: activeContainer.id,
                    active: true,
                };

                activeContainer.children.push(id);
            }
        }

        this.execute(window.get_workspace().index(), window.get_monitor());
    }

    getContainers(workspace, monitor) {
        return Object.values(this.containers)
            .filter(container =>
                container.windows.every(window => window.get_workspace().index() == workspace) &&
                container.windows.every(window => window.get_monitor() == monitor)
            );
    }

    getNextContainerId() {
        let keys = Object.keys(this.containers);
        return keys.length ? Math.max(...keys) + 1 : 0;
    }

    removeWindow(window) {
        this.log.log(`swayi3.js: removing window ${window.get_id()}`);
        let windowItem = this.windows[window.get_id()];

        let container = this.containers[windowItem.containerId];
        container.windows = container.windows.filter(w => w.get_id() !== window.get_id());
        this.execute(windowItem.workspace, windowItem.monitor);
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
        let containers = this.getContainers(workspace, monitor);
        let smartGaps = this.settings.get_boolean("smart-gaps");

        let gaps = (smartGaps && containers.length == 1) ? 0 :
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

        //this.cacheWindows();
        this.log.debug(`swayi3.js: executing on ${workspace}, ${monitor} with ${containers.length} containers`);

        let root = containers.filter(container => container.parent === null)[0];

        this.mapWindowsIntoWorkArea(root, work_area, workspace, monitor);
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

        this.log.log(`swayi3.js: mapping container ${container.id}`);

        let length = (container.children && container.children.length) || (container.windows && container.windows.length);

        let x_y = container.direction == HORIZONTAL ? workArea.x : workArea.y;
        let h_w = container.direction == HORIZONTAL ?
                (workArea.width - ((container.windows.length - 1) * gaps)) / container.windows.length :
                (workArea.height - ((container.windows.length - 1) * gaps)) / container.windows.length;


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

            if (container.windows) {
                container.windows[i].move_resize_frame(true,
                    geometry.x,
                    geometry.y,
                    geometry.width,
                    geometry.height
                );
            } else {
                // map sub-containers into this space
            }

            x_y += gaps + h_w;
        }
    }
}
