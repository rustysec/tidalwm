// @ts-ignore
const ExtensionUtils = imports.misc.extensionUtils;
// @ts-ignore
const Me = ExtensionUtils.getCurrentExtension();
// @ts-ignore
import * as Meta from imports.gi;
import * as Log from 'logging';

export class Tidal {
    log: Log.Logging;

    constructor() {
        this.log = new Log.Logging(1, 'tidal.js');
    }

    addWindow(window: Meta.Window) {
        this.log.log(`adding ${window.get_id()} to tidal`);
    }

    closeWindow(window: Meta.Window) {
        this.log.log(`removing ${window.get_id()} from tidal`);
    }

    removeWindow(_window: Meta.Window) {}
}
