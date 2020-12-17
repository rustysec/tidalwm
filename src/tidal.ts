// @ts-ignore
import * as Meta from imports.gi;
// @ts-ignore
const ExtensionUtils = imports.misc.extensionUtils;
// @ts-ignore
const Me = ExtensionUtils.getCurrentExtension();
import * as Log from 'logging';
import * as Container from 'container';
import * as Settings from 'settings';


const HORIZONTAL = 0;
// @ts-ignore
const VERTICAL = 1;

export class Tidal {
    log: Log.Logging;
    windows: { [index:number]: Container.Container } = {};
    settings: Settings.Settings;

    constructor(settings: Settings.Settings) {
        this.log = new Log.Logging(settings.logLevel(), 'tidal.js');
        this.settings = settings;
    }

    windowCreated(window: Meta.Window) {
        let id: number = window.get_id();
        this.log.log(`new window created ${id}`);
        if (!this.windows[id]) {
            this.windows[id] = new Container.Container(window);
            this.addWindow(window);
        }
    }

    addWindow(window: Meta.Window) {
        let id: number = window.get_id();
        let current: Container.Container = this.windows[id];

        if (current) {
            this.log.log(`adding ${window.get_id()} to tidal`);

            for (var set of current.getWorkspacesAndMonitors()) {
                let { workspace, monitor } = set;
                current.setOrder(this.getNextOrder(workspace, monitor));
                this.spiral(workspace, monitor);
            }
        }
    }

    closeWindow(window: Meta.Window) {
        this.log.log(`removing ${window.get_id()} from tidal (closed)`);
        this.removeWindow(window);
    }

    removeWindow(window: Meta.Window) {
        let id = window.get_id();
        this.log.log(`removing window ${id} from tidal`);
        let monitor = this.windows[id].monitorNumber;
        let workSpace = this.windows[id].workspaceNumber;
        this.log.log(`removal ${id} on ${workSpace}:${monitor}`);
        delete this.windows[id];
        this.resetOrders(workSpace, monitor)
        this.spiral(workSpace, monitor);
    }

    getNextOrder(workspace: number, monitor: number) {
        return (Math.max(...Object.values(this.windows)
            .filter(item => item.isOnWorkspaceAndMonitor(workspace, monitor))
            .map(item => item.getOrder() || 0)
        ) + 1 || 0);
    }

    // returns a sorted list of containers
    getContainers(workspace_number: number, monitor: number) {
        let containers = Object.values(this.windows)
            .filter(item => item.isOnWorkspaceAndMonitor(workspace_number, monitor))
            .sort((left, right) => {
                if (left.order < right.order) {
                    return -1;
                } else if (left.order > right.order) {
                    return 1;
                } else {
                    return left.window.get_id() < right.window.get_id() ? -1 : 1;
                }
            });
        return containers;
    }

    resetOrders(workspace: number, monitor: number) {
        let containers = this.getContainers(workspace, monitor);

        let order = 0;
        for (var container of containers) {
            container.setOrder(order);
            order++;
        }
    }


    spiral(workspace_number: number, monitor: number) {
        this.log.log(`spiraling ws ${workspace_number} monitor ${monitor}`); 
        let containers = this.getContainers(workspace_number, monitor);

        // @ts-ignore
        let workspace = global.workspace_manager.get_workspace_by_index(workspace_number);

        let initialDirection = this.settings.initialDirection();
        let scale = workspace.get_display().get_monitor_scale(monitor);
        let smartGaps = this.settings.smartGaps();
        let gaps = (smartGaps && containers.length == 1) ? 0 :
            this.settings.gaps() * scale;

        let workArea = workspace.get_work_area_for_monitor(monitor);

        if (!smartGaps || containers.length > 1) {
            workArea.x = workArea.x + gaps;
            workArea.y = workArea.y + gaps;
            workArea.width = workArea.width - (gaps * 2);
            workArea.height = workArea.height - (gaps * 2);
        }

        for (var index = 0; index < containers.length; index++) {
            let container = containers[index];
            this.log.log(`doing window ${container.window.get_id()} with order ${container.order}`);

            // set the initial size
            container.window.unmaximize(3);
            container.window.unmake_fullscreen();
            container.position = {
                x: workArea.x,
                y: workArea.y,
                width: workArea.width,
                height: workArea.height
            };

            if (containers.length > 1) {
                // needs bisecting
                if (initialDirection === HORIZONTAL) {
                    let new_width = (workArea.width / 2) - (gaps / 2);
                    container.position.x = workArea.x;
                    container.position.y = workArea.y;
                    container.position.width = (index < (containers.length - 1)) ?
                        (new_width + container.hSplit) : workArea.width;
                    container.position.height = workArea.height;

                    // adjust for the next window
                    workArea.x = workArea.x + gaps + new_width + container.hSplit;
                    workArea.width = new_width - container.hSplit;
                } else {
                    let new_height = (workArea.height / 2) - (gaps / 2);
                    container.position.x = workArea.x;
                    container.position.y = workArea.y;
                    container.position.width = workArea.width;
                    container.position.height = (index < (containers.length - 1)) ?
                        (new_height + container.vSplit) : workArea.height;

                    // adjust for the next window
                    workArea.y = workArea.y + gaps + new_height + container.vSplit;
                    workArea.height = new_height - container.vSplit;
                }
                initialDirection = initialDirection ? 0 : 1;
            }

            let self = container;
            let tmpResize = container.window.connect("size-changed", (window: Meta.Window) => {
                window.disconnect(tmpResize);
                window.move_resize_frame(true,
                    self.position.x,
                    self.position.y,
                    self.position.width,
                    self.position.height,
                );
            });
            container.window.move_resize_frame(true,
                container.position.x,
                container.position.y,
                container.position.width,
                container.position.height,
            );
        }
    }
}
