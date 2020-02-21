const Meta = imports.gi.Meta;

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

        if (container.children) {
            this.log.log(`swayi3.js: mapping children`);
        } else {
            this.log.log(`swayi3.js: mapping windows`);
            let width = (workArea.width - ((container.windows.length - 1) * gaps)) / container.windows.length;
            let x = workArea.x;

            for (var i = 0; i < container.windows.length; i++) {
                container.windows[i].move_resize_frame(true,
                    x,
                    workArea.y,
                    width,
                    workArea.height
                );

                x += gaps + width;
            }
        }
    }
}
