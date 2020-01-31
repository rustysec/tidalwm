'use strict';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

function buildPrefsWidget() {

    let row = 0;

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
    let prefsWidget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    // Add a simple title and add it to the prefsWidget
    let title = new Gtk.Label({
        // As described in "Extension Translations", the following template
        // lit
        // prefs.js:88: warning: RegExp literal terminated too early
        //label: `<b>${Me.metadata.name} Extension Preferences</b>`,
        label: '<b>' + Me.metadata.name + ' Extension Preferences</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(title, 0, row, 2, 1);
    row += 1;

    /*** Reset ***/
    let buttonLabel = new Gtk.Label({
        label: 'Reset To Defaults:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(buttonLabel, 0, row, 1, 1);

    let button = new Gtk.Button({
        label: 'Reset',
        visible: true
    });
    prefsWidget.attach(button, 1, row, 1, 1);

    button.connect('clicked', (button) => this.settings.reset('window-gaps'));
    row += 1;

    /*** Gaps Settings ***/
    let toggleLabel = new Gtk.Label({
        label: 'Window Gaps:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(toggleLabel, 0, row, 1, 1);

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
    prefsWidget.attach(gaps, 1, row, 1, 1);
    gaps.connect('value-changed', () => this.settings.set_int("window-gaps", gaps.get_value()));
    row += 1;

    /** Smart Gaps **/
    let label = new Gtk.Label({
        label: 'Smart Gaps:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(label, 0, row, 1, 1);
    let smartGapsSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('smart-gaps'),
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(smartGapsSwitch, 1, row, 1, 1);
    smartGapsSwitch.connect('state-set', (t) => {
        this.settings.set_boolean("smart-gaps", smartGapsSwitch.get_active());
        this.settings.apply();
    });
    row += 1;

    /*** Tiling Mode ***/
    let tileModeLabel = new Gtk.Label({
        label: 'Tiling Mode:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(tileModeLabel, 0, row, 1, 1); 

    let radio_spiral = new Gtk.RadioButton({label: 'Spiral', visible: true});
    let radio_binary = new Gtk.RadioButton({label: 'Binary', visible: true, group: radio_spiral});
    let radio_i3 = new Gtk.RadioButton({label: 'i3/Sway', visible: true, group: radio_spiral});

    // awaiting implementation
    radio_binary.set_sensitive(false);
    radio_i3.set_sensitive(false);

    prefsWidget.attach(radio_spiral, 1, row, 1, 1);
    row += 1;
    prefsWidget.attach(radio_binary, 1, row, 1, 1);
    row += 1;
    prefsWidget.attach(radio_i3, 1, row, 1, 1);
    row += 1;

    /*** Inactive Opacity ***/
    let inactiveOpacity = new Gtk.Label({
        label: 'Inactive Window Opacity:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(inactiveOpacity, 0, row, 1, 1);

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
    prefsWidget.attach(opacity, 1, row, 1, 1);
    opacity.connect('value-changed', () => this.settings.set_int("inactive-opacity", opacity.get_value()));
    row += 1;

    /*** Hotkeys ***/
    label = new Gtk.Label({
        label: 'Float Window:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(label, 0, row, 1, 1);

    let floatEntry = new Gtk.Entry({
        visible: true
    });
    floatEntry.set_text(this.settings.get_strv("float-window")[0]);
    prefsWidget.attach(floatEntry, 1, row, 1, 1);
    floatEntry.connect('changed', () => this.settings.set_strv("float-window", [floatEntry.get_text()]));
    row += 1;

    label = new Gtk.Label({
        label: 'Rotate Windows:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(label, 0, row, 1, 1);

    let rotateEntry = new Gtk.Entry({
        visible: true
    });
    rotateEntry.set_text(this.settings.get_strv("rotate-windows")[0]);
    prefsWidget.attach(rotateEntry, 1, row, 1, 1);
    rotateEntry.connect('changed', () => this.settings.set_strv("rotate-windows", [rotateEntry.get_text()]));
    row += 1;

    /*** Always Float ***/
    label = new Gtk.Label({
        label: 'Always Float:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(label, 0, row, 1, 1);

    let alwaysFloatEntry = new Gtk.Entry({
        visible: true
    });
    alwaysFloatEntry.set_text(this.settings.get_strv("always-float")[0]);
    prefsWidget.attach(alwaysFloatEntry, 1, row, 1, 1);
    alwaysFloatEntry.connect('changed', () => this.settings.set_strv("always-float", [alwaysFloatEntry.get_text()]));
    row += 1;

    /*** Initial Split Direction ***/
    label = new Gtk.Label({
        label: 'Initial Split Direction:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(label, 0, row, 1, 1); 

    let radio_horizontal = new Gtk.RadioButton({label: 'Horizontal', visible: true});
    let radio_vertical = new Gtk.RadioButton({label: 'Vertical', visible: true, group: radio_horizontal});

    radio_horizontal.connect('toggled', () => this.settings.set_int("initial-direction", 0));
    radio_vertical.connect('toggled', () => this.settings.set_int("initial-direction", 1));

    prefsWidget.attach(radio_horizontal, 1, row, 1, 1);
    row += 1;
    prefsWidget.attach(radio_vertical, 1, row, 1, 1);
    row += 1;

    /*** Initial Split Direction ***/
    label = new Gtk.Label({
        label: 'Logging level:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(label, 0, row, 1, 1); 

    let radio_logging_info = new Gtk.RadioButton({label: 'Info', visible: true});
    let radio_logging_debug = new Gtk.RadioButton({label: 'Debug', visible: true, group: radio_logging_info});
    let radio_logging_verbose = new Gtk.RadioButton({label: 'Verbosd', visible: true, group: radio_logging_info});

    radio_logging_info.connect('toggled', () => this.settings.set_int("log-level", 0));
    radio_logging_debug.connect('toggled', () => this.settings.set_int("log-level", 1));
    radio_logging_verbose.connect('toggled', () => this.settings.set_int("log-level", 2));

    prefsWidget.attach(radio_logging_info, 1, row, 1, 1);
    row += 1;
    prefsWidget.attach(radio_logging_debug, 1, row, 1, 1);
    row += 1;
    prefsWidget.attach(radio_logging_verbose, 1, row, 1, 1);
    row += 1;

    // Return our widget which will be added to the window
    return prefsWidget;
}
