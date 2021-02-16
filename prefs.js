'use strict';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {}

function buildPrefsWidget() {
    // Copy the same GSettings code from `extension.js`
    let gschema = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
    );

    this.settings = new Gio.Settings({
        settings_schema: gschema.lookup('org.gnome.shell.extensions.tidalwm', true)
    });

    // Create a parent widget that we'll return from this function
    let widget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    // Add a simple title and add it to the widget
    let title = new Gtk.Label({
        label: '<b>' + Me.metadata.name + ' Extension Preferences</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    widget.attach(title, 0, 0, 2, 1);

    let notebook = new Gtk.Notebook({
        halign: Gtk.Align.FILL,
        visible: true,
        scrollable: true,
    });
    widget.attach(notebook, 0, 1, 10, 10);

    let label = new Gtk.Label({
        label: 'Gaps',
        halign: Gtk.Align.START,
        use_markup: false,
        visible: true
    });

    notebook.append_page(gapsWidget(), label);

    label = new Gtk.Label({
        label: 'Windows',
        halign: Gtk.Align.START,
        use_markup: false,
        visible: true
    });
    notebook.append_page(windowWidget(), label);

    label = new Gtk.Label({
        label: 'Tiling',
        halign: Gtk.Align.START,
        use_markup: false,
        visible: true
    });
    notebook.append_page(tilingWidget(), label);

    label = new Gtk.Label({
        label: 'Hotkeys',
        halign: Gtk.Align.START,
        use_markup: false,
        visible: true
    });
    notebook.append_page(hotkeysWidget(), label);

    label = new Gtk.Label({
        label: 'Misc',
        halign: Gtk.Align.START,
        use_markup: false,
        visible: true
    });
    notebook.append_page(miscWidget(), label);

    return widget;
}

function gapsWidget() {
    // Create a parent widget that we'll return from this function
    let widget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    let row = 0;

    /*** Gaps Settings ***/
    let toggleLabel = new Gtk.Label({
        label: 'Window Gaps:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(toggleLabel, 0, row, 1, 1);

    let gaps_adjustment = new Gtk.Adjustment({
        lower: 0,
        upper: 90,
        step_increment: 1,
        value: this.settings.get_int("window-gaps"),
    });

    let gaps = new Gtk.SpinButton({
        value: this.settings.get_int("window-gaps"),
        numeric: true,
        snap_to_ticks: true,
        wrap: true,
        visible: true,
        input_purpose: "number",
        adjustment: gaps_adjustment,
    });
    widget.attach(gaps, 1, row, 1, 1);
    gaps.connect('value-changed', () => this.settings.set_int("window-gaps", gaps.get_value()));
    row += 1;

    /** Smart Gaps **/
    let smartGapsFullscreenSwitch;

    let label = new Gtk.Label({
        label: 'Smart Gaps:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);
    let smartGapsSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('smart-gaps'),
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(smartGapsSwitch, 1, row, 1, 1);
    smartGapsSwitch.connect('state-set', (_t) => {
        this.settings.set_boolean("smart-gaps", smartGapsSwitch.get_active());
        this.settings.apply();
        smartGapsFullscreenSwitch.set_sensitive(smartGapsSwitch.get_active());
    });
    row += 1;

    /** Smart Gaps Full Screen **/
    /* Experimental still
    label = new Gtk.Label({
        label: 'Smart Fullscreen:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);
    smartGapsFullscreenSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('smart-gaps-fullscreen'),
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(smartGapsFullscreenSwitch, 1, row, 1, 1);
    smartGapsFullscreenSwitch.connect('state-set', (_t) => {
        this.settings.set_boolean("smart-gaps-fullscreen", smartGapsFullscreenSwitch.get_active());
        this.settings.apply();
    });
    row += 1;
    */

    /** Ignore Scale **/
    label = new Gtk.Label({
        label: 'Ignore Scale:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);
    let ignoreScaleSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('ignore-scale'),
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(ignoreScaleSwitch, 1, row, 1, 1);
    ignoreScaleSwitch.connect('state-set', (_t) => {
        this.settings.set_boolean("ignore-scale", ignoreScaleSwitch.get_active());
        this.settings.apply();
    });

    return widget;
}

function windowWidget() {
    let borderColorEntry;

    // Create a parent widget that we'll return from this function
    let widget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    let row = 0;

    /*** Inactive Opacity ***/
    let label = new Gtk.Label({
        label: 'Inactive Window Opacity:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let inactive_opacity_adjustment = new Gtk.Adjustment({
        lower: 5,
        upper: 100,
        step_increment: 1,
        value: this.settings.get_int("inactive-opacity"),
    });

    let opacity = new Gtk.SpinButton({
        value: this.settings.get_int("inactive-opacity"),
        numeric: true,
        snap_to_ticks: true,
        wrap: true,
        visible: true,
        input_purpose: "number",
        adjustment: inactive_opacity_adjustment,
    });
    widget.attach(opacity, 1, row, 1, 1);
    opacity.connect('value-changed', () => this.settings.set_int("inactive-opacity", opacity.get_value()));
    row += 1;

    /** Highlight Active **/
    label = new Gtk.Label({
        label: 'Highlight Active Window:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);
    let highlightActiveSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('highlight-active'),
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(highlightActiveSwitch, 1, row, 1, 1);
    highlightActiveSwitch.connect('state-set', (_t) => {
        this.settings.set_boolean("highlight-active", highlightActiveSwitch.get_active());
        this.settings.apply();
        borderColorEntry.set_sensitive(highlightActiveSwitch.get_active());
    });
    row += 1;

    /** Highlight Top **/
    label = new Gtk.Label({
        label: 'Active Border Top:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);
    let highlightActiveBorderTopSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('highlight-active-border-top'),
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(highlightActiveBorderTopSwitch, 1, row, 1, 1);
    highlightActiveBorderTopSwitch.connect('state-set', (_t) => {
        this.settings.set_boolean("highlight-active-border-top", highlightActiveBorderTopSwitch.get_active());
        this.settings.apply();
    });
    row += 1;

    /** Highlight Right **/
    label = new Gtk.Label({
        label: 'Active Border Right:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);
    let highlightActiveBorderRightSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('highlight-active-border-right'),
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(highlightActiveBorderRightSwitch, 1, row, 1, 1);
    highlightActiveBorderRightSwitch.connect('state-set', (_t) => {
        this.settings.set_boolean("highlight-active-border-right", highlightActiveBorderRightSwitch.get_active());
        this.settings.apply();
    });
    row += 1;

    /** Highlight Bottom **/
    label = new Gtk.Label({
        label: 'Active Border Bottom:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);
    let highlightActiveBorderBottomSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('highlight-active-border-bottom'),
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(highlightActiveBorderBottomSwitch, 1, row, 1, 1);
    highlightActiveBorderBottomSwitch.connect('state-set', (_t) => {
        this.settings.set_boolean("highlight-active-border-bottom", highlightActiveBorderBottomSwitch.get_active());
        this.settings.apply();
    });
    row += 1;

    /** Highlight Left **/
    label = new Gtk.Label({
        label: 'Active Border Left:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);
    let highlightActiveBorderLeftSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('highlight-active-border-left'),
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(highlightActiveBorderLeftSwitch, 1, row, 1, 1);
    highlightActiveBorderLeftSwitch.connect('state-set', (_t) => {
        this.settings.set_boolean("highlight-active-border-left", highlightActiveBorderLeftSwitch.get_active());
        this.settings.apply();
    });
    row += 1;

    /*** Border Width ***/
    label = new Gtk.Label({
        label: 'Border width:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let border_adjustment = new Gtk.Adjustment({
        lower: 0,
        upper: 20,
        step_increment: 1,
        value: this.settings.get_int("highlight-active-border-width"),
    });

    let border = new Gtk.SpinButton({
        value: this.settings.get_int("highlight-active-border-width"),
        numeric: true,
        snap_to_ticks: true,
        wrap: true,
        visible: true,
        input_purpose: "number",
        adjustment: border_adjustment,
    });
    widget.attach(border, 1, row, 1, 1);
    border.connect('value-changed', () => this.settings.set_int("highlight-active-border-width", border.get_value()));
    row += 1;

    /*** Highlight Color ***/
    label = new Gtk.Label({
        label: 'Border Color:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    borderColorEntry = new Gtk.Entry({
        visible: true
    });
    borderColorEntry.set_sensitive(this.settings.get_boolean("highlight-active"));
    borderColorEntry.set_text(this.settings.get_string("highlight-active-border-color"));
    widget.attach(borderColorEntry, 1, row, 1, 1);
    borderColorEntry.connect('changed', () => this.settings.set_string("highlight-active-border-color", borderColorEntry.get_text()));
    row += 1;

    /*** Always Float List ***/
    label = new Gtk.Label({
        label: 'Always Float:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let alwaysFloatEntry = new Gtk.Entry({
        visible: true
    });
    alwaysFloatEntry.set_text(this.settings.get_strv("always-float")[0]);
    widget.attach(alwaysFloatEntry, 1, row, 1, 1);
    alwaysFloatEntry.connect('changed', () => this.settings.set_strv("always-float", [alwaysFloatEntry.get_text()]));
    row += 1;

    return widget;
}

function tilingWidget() {
    let first_window_width;

    // Create a parent widget that we'll return from this function
    let widget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    let row = 0;

    /*** Tiling Mode ***/
    let label = new Gtk.Label({
        label: 'Tiling Mode:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1); 

    let radio_spiral = new Gtk.RadioButton({label: 'Spiral', visible: true});
    let radio_binary = new Gtk.RadioButton({label: 'Binary', visible: true, group: radio_spiral});
    let radio_i3 = new Gtk.RadioButton({label: 'i3/Sway', visible: true, group: radio_spiral});

    // awaiting implementation
    radio_binary.set_sensitive(false);
    radio_i3.set_sensitive(false);

    widget.attach(radio_spiral, 1, row, 1, 1);
    row += 1;
    widget.attach(radio_binary, 1, row, 1, 1);
    row += 1;
    widget.attach(radio_i3, 1, row, 1, 1);
    row += 1;

    /*** Initial Split Direction ***/
    label = new Gtk.Label({
        label: 'Initial Split Direction:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1); 
    let initial_direction = this.settings.get_int("initial-direction");

    let radio_horizontal = new Gtk.RadioButton({
        label: 'Horizontal',
        visible: true,
        active: initial_direction === 0}
    );
    let radio_vertical = new Gtk.RadioButton({
        label: 'Vertical',
        visible: true, group: radio_horizontal,
        active: initial_direction === 1}
    );

    radio_horizontal.connect('toggled', () => {
        this.settings.set_int("initial-direction", 0);
        this.settings.apply();
        first_window_width.set_sensitive(true);
    });
    radio_vertical.connect('toggled', () => {
        this.settings.set_int("initial-direction", 1);
        this.settings.apply();
        first_window_width.set_sensitive(false);
    });

    widget.attach(radio_horizontal, 1, row, 1, 1);
    row += 1;
    widget.attach(radio_vertical, 1, row, 1, 1);
    row += 1;

    /*** Ratio of the first window ***/
    label = new Gtk.Label({
        label: 'First Window Width Percent:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1); 

    let width_adjustment = new Gtk.Adjustment({
        lower: 10,
        upper: 90,
        step_increment: 1,
        value: this.settings.get_int("first-window-width-percent"),
    });

    first_window_width = new Gtk.SpinButton({
        value: this.settings.get_int("first-window-width-percent"),
        numeric: true,
        snap_to_ticks: true,
        wrap: true,
        visible: true,
        input_purpose: "number",
        adjustment: width_adjustment,
    });
    widget.attach(first_window_width, 1, row, 1, 1);
    first_window_width.connect('value-changed', () => this.settings.set_int("first-window-width-percent", first_window_width.get_value()));
    row += 1;

    return widget;
}

function hotkeysWidget() {
    // Create a parent widget that we'll return from this function
    let widget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    let row = 0;

    /*** Hotkeys ***/
    let label = new Gtk.Label({
        label: 'Float Window:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let floatEntry = new Gtk.Entry({
        visible: true
    });
    floatEntry.set_text(this.settings.get_strv("float-window")[0]);
    widget.attach(floatEntry, 1, row, 1, 1);
    floatEntry.connect('changed', () => {
        this.settings.set_strv("float-window", [floatEntry.get_text()]);
        this.settings.apply();
    });
    row += 1;

    label = new Gtk.Label({
        label: 'Rotate Windows:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let rotateEntry = new Gtk.Entry({
        visible: true
    });
    rotateEntry.set_text(this.settings.get_strv("rotate-windows")[0]);
    widget.attach(rotateEntry, 1, row, 1, 1);
    rotateEntry.connect('changed', () => {
        this.settings.set_strv("rotate-windows", [rotateEntry.get_text()])
        this.settings.apply();
    });
    row += 1;

    label = new Gtk.Label({
        label: 'Increase Horizontal Split:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let increaseHSplitEntry = new Gtk.Entry({
        visible: true
    });
    increaseHSplitEntry.set_text(this.settings.get_strv("increase-hsplit").join(","));
    widget.attach(increaseHSplitEntry, 1, row, 1, 1);
    increaseHSplitEntry.connect('changed', () => {
        this.settings.set_strv("increase-hsplit", increaseHSplitEntry.get_text().split(","))
        this.settings.apply();
    });
    row += 1;

    label = new Gtk.Label({
        label: 'Decrease Horizontal Split:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let decreaseHSplitEntry = new Gtk.Entry({
        visible: true
    });
    decreaseHSplitEntry.set_text(this.settings.get_strv("decrease-hsplit").join(","));
    widget.attach(decreaseHSplitEntry, 1, row, 1, 1);
    decreaseHSplitEntry.connect('changed', () => {
        this.settings.set_strv("decrease-hsplit", decreaseHSplitEntry.get_text().split(","))
        this.settings.apply();
    });
    row += 1;

    label = new Gtk.Label({
        label: 'Increase Vertical Split:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let increaseVSplitEntry = new Gtk.Entry({
        visible: true
    });
    increaseVSplitEntry.set_text(this.settings.get_strv("increase-vsplit").join(","));
    widget.attach(increaseVSplitEntry, 1, row, 1, 1);
    increaseVSplitEntry.connect('changed', () => {
        this.settings.set_strv("increase-vsplit", increaseVSplitEntry.get_text().split(","))
        this.settings.apply();
    });
    row += 1;

    label = new Gtk.Label({
        label: 'Decrease Vertical Split:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let decreaseVSplitEntry = new Gtk.Entry({
        visible: true
    });
    decreaseVSplitEntry.set_text(this.settings.get_strv("decrease-vsplit").join(","));
    widget.attach(decreaseVSplitEntry, 1, row, 1, 1);
    decreaseVSplitEntry.connect('changed', () => {
        this.settings.set_strv("decrease-vsplit", decreaseVSplitEntry.get_text().split(","))
        this.settings.apply();
    });
    row += 1;

    label = new Gtk.Label({
        label: 'Select Window Above:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let selectWindowAboveEntry = new Gtk.Entry({
        visible: true
    });
    selectWindowAboveEntry.set_text(this.settings.get_strv("select-window-above").join(","));
    widget.attach(selectWindowAboveEntry, 1, row, 1, 1);
    selectWindowAboveEntry.connect('changed', () => {
        this.settings.set_strv("select-window-above", selectWindowAboveEntry.get_text().split(","))
        this.settings.apply();
    });
    row += 1;

    label = new Gtk.Label({
        label: 'Select Window Below:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let selectWindowBelowEntry = new Gtk.Entry({
        visible: true
    });
    selectWindowBelowEntry.set_text(this.settings.get_strv("select-window-below").join(","));
    widget.attach(selectWindowBelowEntry, 1, row, 1, 1);
    selectWindowBelowEntry.connect('changed', () => {
        this.settings.set_strv("select-window-below", selectWindowBelowEntry.get_text().split(","))
        this.settings.apply();
    });
    row += 1;

    label = new Gtk.Label({
        label: 'Select Window Left:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let selectWindowLeftEntry = new Gtk.Entry({
        visible: true
    });
    selectWindowLeftEntry.set_text(this.settings.get_strv("select-window-left").join(","));
    widget.attach(selectWindowLeftEntry, 1, row, 1, 1);
    selectWindowLeftEntry.connect('changed', () => {
        this.settings.set_strv("select-window-left", selectWindowLeftEntry.get_text().split(","))
        this.settings.apply();
    });
    row += 1;

    label = new Gtk.Label({
        label: 'Select Window Right:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1);

    let selectWindowRightEntry = new Gtk.Entry({
        visible: true
    });
    selectWindowRightEntry.set_text(this.settings.get_strv("select-window-right").join(","));
    widget.attach(selectWindowRightEntry, 1, row, 1, 1);
    selectWindowRightEntry.connect('changed', () => {
        this.settings.set_strv("select-window-right", selectWindowRightEntry.get_text().split(","))
        this.settings.apply();
    });
    row += 1;

    // Return our widget which will be added to the window
    return widget;
}

function miscWidget() {
    // Create a parent widget that we'll return from this function
    let widget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    let row = 0;

    /*** Logging Levels ***/
    let label = new Gtk.Label({
        label: 'Logging level:',
        halign: Gtk.Align.START,
        visible: true
    });
    widget.attach(label, 0, row, 1, 1); 

    let radio_logging_info = new Gtk.RadioButton({label: 'Info', visible: true});
    let radio_logging_debug = new Gtk.RadioButton({label: 'Debug', visible: true, group: radio_logging_info});
    let radio_logging_verbose = new Gtk.RadioButton({label: 'Verbose', visible: true, group: radio_logging_info});

    radio_logging_info.connect('toggled', () => this.settings.set_int("log-level", 0));
    radio_logging_debug.connect('toggled', () => this.settings.set_int("log-level", 1));
    radio_logging_verbose.connect('toggled', () => this.settings.set_int("log-level", 2));

    widget.attach(radio_logging_info, 1, row, 1, 1);
    row += 1;
    widget.attach(radio_logging_debug, 1, row, 1, 1);
    row += 1;
    widget.attach(radio_logging_verbose, 1, row, 1, 1);
    row += 1;

    return widget;
}
