const { Clutter, GObject, St, Meta } = imports.gi;

var ActiveHighlight = 
class ActiveHighlight {
    constructor(settings) {
        this._settings = settings;
        this._windowSizeSignal = null;
        this._windowPositionSignal = null;
        this._borderColor = this._settings.get_string("highlight-active-border-color") || "#eaeaea";
        this._borderWidth = this._settings.get_int("highlight-active-border-width") || 0;
        this._borderTop = this._settings.get_boolean("highlight-active-border-top") || false;
        this._borderRight = this._settings.get_boolean("highlight-active-border-right") || false;
        this._borderBottom = this._settings.get_boolean("highlight-active-border-bottom") || false;
        this._borderLeft = this._settings.get_boolean("highlight-active-border-left") || false;

        this._highlightTop = new St.Widget({ style: `background-color: ${this._borderColor};` });
        this._highlightRight = new St.Widget({ style: `background-color: ${this._borderColor};` });
        this._highlightBottom = new St.Widget({ style: `background-color: ${this._borderColor};` });
        this._highlightLeft = new St.Widget({ style: `background-color: ${this._borderColor};` });

        global.window_group.add_child(this._highlightTop);
        global.window_group.add_child(this._highlightRight);
        global.window_group.add_child(this._highlightBottom);
        global.window_group.add_child(this._highlightLeft);
    }

    set window(window) {
        if (window && window !== this._window) {
            if (this._window && this._windowSizeSignal && this._windowPositionSignal) {
                this._window.disconnect(this._windowSizeSignal);
                this._window.disconnect(this._windowPositionSignal);
            }

            this._window = window;
            this._windowSignalSizeChanged = this._window.connect("size-changed", (win) => this.windowShown(this, win));
            this._windowSignalPositionChanged = this._window.connect("position-changed", (win) => this.windowShown(this, win));
            this.refresh();
        }
    }

    set color(c) {
        if (c && c !== this._borderColor) {
            this._borderColor = c;
            this._highlightTop.style = `background-color: ${this._borderColor};`;
            this._highlightRight.style = `background-color: ${this._borderColor};`;
            this._highlightBottom.style = `background-color: ${this._borderColor};`;
            this._highlightLeft.style = `background-color: ${this._borderColor};`;
            this.refresh();
        }
    }

    set width(width) {
        if (width && width !== this._borderWidth) {
            this._borderWidth = width;
            this.refresh();
        }
    }

    set top(i) {
        this._borderTop = i;
        if (!i)
            this._highlightTop.hide();
        this.refresh();
    }

    set right(i) {
        this._borderRight = i || false;
        if (!i)
            this._highlightRight.hide();
        this.refresh();
    }

    set bottom(i) {
        this._borderBottom = i || false;
        if (!i)
            this._highlightBottom.hide();
        this.refresh();
    }

    set left(i) {
        this._borderLeft = i || false;
        if (!i)
            this._highlightLeft.hide();
        this.refresh();
    }

    windowShown(self, window) {
        self.refresh();
    }

    windowIsMaximized() {
        if (this._window && this._window.get_workspace()) {
            let monitor = this._window.get_monitor();
            let workArea = this._window.get_workspace().get_work_area_for_monitor(monitor);
            let windowFrame = this._window.get_frame_rect();
            let maxed = workArea.x === windowFrame.x &&
                workArea.y === windowFrame.y &&
                workArea.width === windowFrame.width &&
                workArea.height === windowFrame.height;
            return maxed;
        } else {
            return false;
        }
    }

    refresh() {
        if (
            this._window &&
            !this._window.minimized &&
            !this.windowIsMaximized()
        ) {
            let workspace = this._window.get_workspace().index();
            let monitor = this._window.get_monitor();

            let rect = this._window.get_frame_rect();
            let scale = this._settings.get_boolean("ignore-scale") ? 1 :
                global.workspace_manager.get_workspace_by_index(workspace)
                    .get_display()
                    .get_monitor_scale(monitor);
            let borderWidth = this._borderWidth * scale;

            if (this._borderTop) {
                let width = rect.width +
                    (this._borderRight ? borderWidth : 0) +
                    (this._borderLeft ? borderWidth : 0);
                this._highlightTop.set_size(width, borderWidth);
                this._highlightTop.set_position(
                    rect.x - (this._borderLeft ? borderWidth : 0),
                    rect.y - borderWidth
                );
                this._highlightTop.show();
            }

            if (this._borderBottom) {
                let width = rect.width +
                    (this._borderRight ? borderWidth : 0) +
                    (this._borderLeft ? borderWidth : 0);
                this._highlightBottom.set_size(width, borderWidth);
                this._highlightBottom.set_position(
                    rect.x - (this._borderLeft ? borderWidth : 0),
                    rect.y + rect.height
                );
                this._highlightBottom.show();
            }

            if (this._borderRight) {
                let height = rect.height;
                this._highlightRight.set_size(borderWidth, height);
                this._highlightRight.set_position(
                    rect.x + rect.width,
                    rect.y
                );
                this._highlightRight.show();
            }

            if (this._borderLeft) {
                let height = rect.height;
                this._highlightLeft.set_size(borderWidth, height);
                this._highlightLeft.set_position(
                    rect.x - borderWidth,
                    rect.y
                );
                this._highlightLeft.show();
            }

        } else {
            this._highlightTop.set_size(0, 0);
            this.hide();
        }
    }

    hide() {
        if (this._highlightTop)
            this._highlightTop.hide();
        if (this._highlightRight)
            this._highlightRight.hide();
        if (this._highlightBottom)
            this._highlightBottom.hide();
        if (this._highlightLeft)
            this._highlightLeft.hide();
    }

    show() {
        if (this._highlightTop)
            this._highlightTop.show();
        if (this._highlightRight)
            this._highlightRight.show();
        if (this._highlightBottom)
            this._highlightBottom.show();
        if (this._highlightLeft)
            this._highlightLeft.show();
    }
};
