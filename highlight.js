
const { Clutter, GObject, St } = imports.gi;

var ActiveHighlight = GObject.registerClass(
class ActiveHighlight extends St.Widget {
    _init() {
        super._init({ layout_manager: new Clutter.BinLayout() });
        this._window = null;

        this._clone = new Clutter.Clone();
        this.add_actor(this._clone);

        this._highlight = new St.Widget({ style_class: 'cycler-highlight' });
        this.add_actor(this._highlight);

        let coordinate = Clutter.BindCoordinate.ALL;
        let constraint = new Clutter.BindConstraint({ coordinate });
        this._clone.bind_property('source', constraint, 'source', 0);

        this.add_constraint(constraint);

        this.connect('notify::allocation', this._onAllocationChanged.bind(this));
        this.connect('destroy', this._onDestroy.bind(this));
    }

    set window(w) {
        if (!w || this._window == w)
            return;

        this._window = w;

        if (this._clone.source)
            this._clone.source.sync_visibility();

        let windowActor = this._window
            ? this._window.get_compositor_private() : null;

        this._clone.source = windowActor;
    }

    _onAllocationChanged() {
        if (!this._window) {
            this._highlight.set_size(0, 0);
            this._highlight.hide();
        } else {
            let [x, y] = this.allocation.get_origin();
            let rect = this._window.get_frame_rect();
            this._highlight.set_size(rect.width + 10, rect.height + 10);
            this._highlight.set_position(rect.x - (x + 5), rect.y - (y + 5));
            this._highlight.show();
        }
    }

    _onDestroy() {
        this.window = null;
    }
});
