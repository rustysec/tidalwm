// @ts-ignore
import * as Meta from imports.gi;
// @ts-ignore
const ExtensionUtils = imports.misc.extensionUtils;
// @ts-ignore
const Me = ExtensionUtils.getCurrentExtension();
// @ts-ignore
const MaximizeFlagsBoth = imports.gi.Meta.MaximizeFlags.Both;
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
        delete this.windows[id];
    }

    getNextOrder(workspace: number, monitor: number) {
        return (Math.max(...Object.values(this.windows)
            .filter(item => item.isOnWorkspaceAndMonitor(workspace, monitor))
            .map(item => item.getOrder() || 0)
        ) + 1 || 0);
    }

    spiral(workspace_number: number, monitor: number) {
        this.log.log(`spiraling ws ${workspace_number} monitor ${monitor}`); 

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

        // @ts-ignore
        let workspace = global.workspace_manager.get_workspace_by_index(workspace_number);

        let initialDirection = this.settings.initialDirection();
        let scale = workspace.get_display().get_monitor_scale(monitor);
        let smartGaps = this.settings.smartGaps();
        let gaps = (smartGaps && containers.length == 1) ? 0 :
            this.settings.gaps() * scale;

        let work_area = workspace.get_work_area_for_monitor(monitor);

        if (!smartGaps || containers.length > 1) {
            work_area.x = work_area.x + gaps;
            work_area.y = work_area.y + gaps;
            work_area.width = work_area.width - (gaps * 2);
            work_area.height = work_area.height - (gaps * 2);
        }

        for (var index = 0; index < containers.length; index++) {
            let container = containers[index];
            this.log.log(`doing window ${container.window.get_id()} with order ${container.order}`);

            // set the initial size
            //container.window.unmaximize(MaximizeFlagsBoth);
            container.window.unmaximize(3);
            container.window.unmake_fullscreen();
            container.position = {
                x: work_area.x,
                y: work_area.y,
                width: work_area.width,
                height: work_area.height
            };

            if (containers.length > 1) {
                // needs bisecting
                if (initialDirection === HORIZONTAL) {
                    let new_width = (work_area.width / 2) - (gaps / 2);
                    container.position.x = work_area.x;
                    container.position.y = work_area.y;
                    container.position.width = (index < (containers.length - 1)) ?
                        (new_width + container.hSplit) : work_area.width;
                    container.position.height = work_area.height;

                    // adjust for the next window
                    work_area.x = work_area.x + gaps + new_width + container.hSplit;
                    work_area.width = new_width - container.hSplit;
                } else {
                    let new_height = (work_area.height / 2) - (gaps / 2);
                    container.position.x = work_area.x;
                    container.position.y = work_area.y;
                    container.position.width = work_area.width;
                    container.position.height = (index < (containers.length - 1)) ?
                        (new_height + container.vSplit) : work_area.height;

                    // adjust for the next window
                    work_area.y = work_area.y + gaps + new_height + container.vSplit;
                    work_area.height = new_height - container.vSplit;
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
