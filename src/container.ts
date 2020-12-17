// @ts-ignore
import * as Meta from imports.gi;
// @ts-ignore
const workspaceManager = global.workspace_manager;

export class Rect {
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(window: Meta.Window) {
        let rect = window.get_frame_rect();

        this.x = rect.x;
        this.y = rect.y;
        this.width = rect.width;
        this.height = rect.height;
    }
}

export class Container {
    active: boolean;
    order: number;
    window: Meta.Window;
    hSplit: number;
    vSplit: number;
    position: Rect;
    workspaceNumber: number;
    monitorNumber: number;

    constructor(window: Meta.Window) {
        this.active = false;
        this.window = window;
        this.order = 0;
        this.hSplit = 0;
        this.vSplit = 0;
        this.position = new Rect(window);
        this.workspaceNumber = window.get_workspace().index();
        this.monitorNumber = window.get_monitor();
    }

    getOrder() : number {
        return this.window.is_on_all_workspaces() ? 0 : this.order;
    }

    setOrder(order: number) {
        this.order = order;
    }

    isOnWorkspaceAndMonitor(workspace: number, monitor: number) : boolean {
        return (
            this.window.is_on_all_workspaces() || 
                (this.window.get_workspace() && this.window.get_workspace().index() == workspace)
            )
            && (this.window.get_monitor() == monitor);
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
