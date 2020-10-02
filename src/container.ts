// @ts-ignore
import * as Meta from imports.gi;

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
    
    set_order(order: number) {
        this.order = order;
    }
}

export class Container {
    active: boolean;
    ordering: Array<Order>;

    constructor(window: Meta.Window) {
        this.ordering = [
            new Order(window)
        ];
        this.active = false;
    }

}
