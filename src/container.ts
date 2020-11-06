// @ts-ignore
import * as Meta from imports.gi;
// @ts-ignore
const workspaceManager = global.workspace_manager;

export class Order {
    workspace: number;
    monitor: number;
    order: number;

    constructor(window: Meta.Window) {
        if (window) {
            this.workspace = window.get_workspace()?.index() || 0;
            this.monitor = window.get_monitor() || 0;
            this.order = 0;
        } else {
            this.workspace = 0;
            this.monitor = 0;
            this.order = 0;
        }
    }
    
    setOrder(order: number) {
        this.order = order;
    }
}

export class Container {
    active: boolean;
    ordering: Array<Order>;
    window: Meta.Window;

    constructor(window: Meta.Window) {
        this.ordering = [
            new Order(window)
        ];
        this.active = false;
        this.window = window;
    }

    getOrder(workspace: number, monitor: number) {
        let order = this.ordering.filter(
            ordering => ordering.monitor === monitor && ordering.workspace === workspace
        );

        return order[0].order || null;
    }

    setOrder(workspace: number, monitor: number, order: number) {
        let ordering = this.ordering.filter(ordering =>
            ordering.workspace === workspace &&
            ordering .monitor === monitor
        )[0];

        if (ordering) {
            ordering.setOrder(order);

        }
    }

    getWorkspacesAndMonitors() : { workspace: number, monitor: number }[] {
        if (this.window.is_on_all_workspaces()) {
            let items = [];
            for (var i = 0; i < workspaceManager.get_n_workspaces(); i++) {
                items.push({
                    workspace: i,
                    monitor: this.window.get_monitor()
                });
            }
            return items;
        } else {
            return [
                {
                    workspace: this.window.get_workspace().index(),
                    monitor: this.window.get_monitor()
                }
            ];

        }
    } 
}
