// @ts-ignore
const ExtensionUtils = imports.misc.extensionUtils;
// @ts-ignore
const Me = ExtensionUtils.getCurrentExtension();
// @ts-ignore
import * as Meta from imports.gi;
import * as Log from 'logging';
import * as Container from 'container';

export class Tidal {
    log: Log.Logging;
    windows: { [index:number]: Container.Container } = {};

    constructor() {
        this.log = new Log.Logging(1, 'tidal.js');
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
                current.setOrder(workspace, monitor, this.getNextOrder(workspace, monitor));
                this.spiral(workspace, monitor);
            }
        }
    }

    closeWindow(window: Meta.Window) {
        this.log.log(`removing ${window.get_id()} from tidal`);
    }

    removeWindow(_window: Meta.Window) {
        let id = _window.get_id();
        this.log.log(`removing window ${id}`);
        delete this.windows[id];
    }

    getNextOrder(workspace: number, monitor: number) {
        return (Math.max(...Object.values(this.windows)
            .map(item => item.getOrder(workspace, monitor) || 0)
        ) + 1 || 0);
    }

    spiral(workspace_number: number, monitor: number) {
        this.log.log(`spiraling ws ${workspace_number} monitor ${monitor}`); 

        let containers = Object.values(this.windows)
            .filter(item => item.window.get_workspace().index() === workspace_number);

        this.log.log(`things: ${containers}`);

        // @ts-ignore
        let workspace = global.workspace_manager.get_workspace_by_index(workspace_number);
        let work_area = workspace.get_work_area_for_monitor(monitor);

        for (var container of containers) {
            this.log.log(`doing window ${container.window.get_id()} with order ${container.ordering}`);
            
            let order = container.ordering.filter(
                order =>
                    order.workspace === workspace &&
                    order.monitor === monitor
                )[0];
            this.log.log(`-> ${order.order}`);
        }
    }
}
