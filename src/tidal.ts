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
            let rect = window.get_work_area_current_monitor();
            this.log.log(`size: ${rect.x}x${rect.y} ${rect.width}x${rect.height}`);

            window.move_resize_frame(true,
                                     rect.x + 20,
                                     rect.y + 20,
                                     rect.width - 40,
                                     rect.height - 40,
                                    );
        }
    }

    closeWindow(window: Meta.Window) {
        this.log.log(`removing ${window.get_id()} from tidal`);
    }

    removeWindow(_window: Meta.Window) {}
}
