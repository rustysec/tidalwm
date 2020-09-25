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
        this.tidal = new Tidal.Tidal();
        this.displaySignals = [];
        this.setupDisplaySignals();
    }

    enable() {
        this.log.log('enabled');
    }

    disabled() {
        this.log.log('disabled');
    }

    setupDisplaySignals() {
        this.displaySignals.push(
            globalDisplay.connect(
                'window-created', (_display: any, window: any) => {
                    this.log.log(`window ${window.get_id()} created`);
                }
            )
        );
        this.displaySignals.push(
            globalDisplay.connect(
                'window-entered-monitor', (_display: any, monitor: number, window: any) => {
                    this.log.log(`window ${window.get_id()} entered monitor ${monitor}`);
                    if (window.get_window_type() == 0) {
                        this.tidal.addWindow(window);
                    }
                }
            )
        );
        this.displaySignals.push(
            globalDisplay.connect(
                'window-left-monitor', (_display: any, monitor: number, window: any) => {
                    this.log.log(`window ${window.get_id()} left monitor ${monitor}`);
                    if (window.get_window_type() == 0) {
                        this.tidal.removeWindow(window);
                    }
                }
            )
        );
    }
}

var extension: Extension;

export function init() {
    if (!extension) {
        extension = new Extension();
    }
    return extension;
}
