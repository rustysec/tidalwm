const Meta = imports.gi.Meta;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const directions = {
    HORIZONTAL: 0,
    VERTICAL: 1
}

var Pool = class PoolClass {

    constructor(settings, workspace, monitor) {
        this.settings = settings;
        this.workspace = workspace;
        this.monitor = monitor;
        this.setTileMode();
    }

    setTileMode() {
        let tileMode = this.settings.get_int("tile-mode");

        if (tileMode == 0) {
            this.container = new Me.imports.spiral.Spiral(
                this.settings,
                this.workspace,
                this.monitor
            );
        } else {
            log(`Unsupported tiling mode ${tileMode}, using spiral`);
            this.container = new Me.imports.spiral.Spiral(
                this.settings,
                this.workspace,
                this.monitor
            );
        }
    }

    addWindow(window) {
        log(`adding window ${window.get_id()} to pool ${this.workspace},${this.monitor}`);
        if (window)
            this.container.addWindow(window);
    }

    removeWindow(window) {
        log(`removing window ${window.get_id()} from pool ${this.workspace},${this.monitor}`);
        if (window)
            this.container.removeWindow(window);
    }

    resetWindow(window) {
        this.container.resetWindow(window);
    }

    rotateWindows() {
        if (this.container.rotateWindows) {
            this.container.rotateWindows();
        }
    }

    getEffectiveMonitor() {
        return this.container.getEffectiveMonitor();
    }

    getEffectiveWorkspace() {
        return this.container.getEffectiveWorkspace();
    }
}
