// @ts-ignore
import * as Meta from imports.gi;
// @ts-ignore
const ExtensionUtils = imports.misc.extensionUtils;
// @ts-ignore
const Me = ExtensionUtils.getCurrentExtension();
// @ts-ignore
const Gio = imports.gi.Gio;
// @ts-ignore
const globalDisplay = global.display;

import * as Settings from 'settings';
import * as Log from 'logging';
import * as Tidal from 'tidal';

class Extension {
    log: Log.Logging;
    settings: Settings.Settings;
    displaySignals: Array<number>;
    tidal: Tidal.Tidal;

    constructor() {
        this.log = new Log.Logging(1, 'extension.js');
        this.settings = new Settings.Settings();
        this.tidal = new Tidal.Tidal(this.settings);
        this.displaySignals = [];
    }

    enable() {
        this.log.log('enabled');
        this.setupDisplaySignals();
    }

    disabled() {
        this.log.log('disabled');
    }

    setupDisplaySignals() {
        this.displaySignals.push(
            globalDisplay.connect(
                'window-created', (_display: any, window: any) => {
                    this.log.log(`window ${window.get_id()} created`);
                    this.windowCreated(window);
                }
            )
        );
        this.displaySignals.push(
            globalDisplay.connect(
                'window-entered-monitor', (_display: any, monitor: number, window: any) => {
                    this.log.log(`window ${window.get_id()} entered monitor ${monitor} (type: ${window.get_window_type()})`);
                    if (window.get_window_type() == 0) {
                        this.tidal.windowChangedMonitor(window);
                    }
                }
            )
        );
        this.displaySignals.push(
            globalDisplay.connect(
                'window-left-monitor', (_display: any, monitor: number, window: any) => {
                    this.log.log(`window ${window.get_id()} left monitor ${monitor} (type: ${window.get_window_type()})`);
                    if (window.get_window_type() == 0) {
                        if (!window.get_workspace()) {
                            this.tidal.closeWindow(window);
                        }
                    }
                }
            )
        );
        this.displaySignals.push(
            globalDisplay.connect("grab-op-end", (_obj: object, _display: object, window: Meta.Window, op: number) => {
                if (window && window.get_window_type() === 0) { 
                    this.log.verbose(`extension.js: grab op ${op} ended for ${window.get_id()}`);
                    if (window &&
                        (op == 36865        // resize (nw)
                        || op == 40961      // resize (ne)
                        || op == 24577      // resize (se)
                        || op == 20481      // resize (sw)
                        || op == 16385      // resize (s)
                        || op == 32769      // resize (n)
                        || op == 4097       // resize (w)
                        || op == 8193)) {   // resize (e)
                            this.tidal.resetWindow(window);
                    } else if (window && op == 1 /* move */) {
                        //this.tidal.dragWindow(window);
                        this.tidal.resetWindow(window);
                    }
                }
            })
        );
    }

    windowCreated(window: any) {
        let windowType = window.get_window_type();
        if (windowType === 0 || windowType === 4) {
            let actor = window.get_compositor_private();

            let id = actor.connect(
                'first-frame', () => {
                    this.log.verbose(`window of type ${window.get_window_type()}, class ${window.get_wm_class()}, and title ${window.get_title()} reached first-frame`);
                    this.tidal.windowCreated(window);
                    actor.disconnect(id);
                }
            )
        }
    }
}

var extension: Extension;

export function init() {
    if (!extension) {
        extension = new Extension();
    }
    return extension;
}
