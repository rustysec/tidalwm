'use strict';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

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
    prefsWidget.attach(title, 0, 0, 2, 1);

    /*** Reset ***/
    let buttonLabel = new Gtk.Label({
        label: 'Reset To Defaults:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(buttonLabel, 0, 1, 1, 1);

    let button = new Gtk.Button({
        label: 'Reset',
        visible: true
    });
    prefsWidget.attach(button, 1, 1, 1, 1);

    button.connect('clicked', (button) => this.settings.reset('window-gaps'));

    /*** Gaps Settings ***/
    let toggleLabel = new Gtk.Label({
        label: 'Window Gaps:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(toggleLabel, 0, 2, 1, 1);

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
    prefsWidget.attach(gaps, 1, 2, 1, 1);
    gaps.connect('value-changed', () => this.settings.set_int("window-gaps", gaps.get_value()));

    /*** Tiling Mode ***/
    let tileModeLabel = new Gtk.Label({
        label: 'Tiling Mode:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(tileModeLabel, 0, 3, 1, 1); 

    let radio_spiral = new Gtk.RadioButton({label: 'Spiral', visible: true});
    let radio_binary = new Gtk.RadioButton({label: 'Binary', visible: true, group: radio_spiral});
    let radio_i3 = new Gtk.RadioButton({label: 'i3/Sway', visible: true, group: radio_spiral});

    // awaiting implementation
    radio_binary.set_sensitive(false);
    radio_i3.set_sensitive(false);

    prefsWidget.attach(radio_spiral, 1, 3, 1, 1);
    prefsWidget.attach(radio_binary, 2, 3, 1, 1);
    prefsWidget.attach(radio_i3, 3, 3, 1, 1);

    /*** Inactive Opacity ***/
    let inactiveOpacity = new Gtk.Label({
        label: 'Inactive Window Opacity:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(inactiveOpacity, 0, 4, 1, 1);

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
    prefsWidget.attach(opacity, 1, 4, 1, 1);
    opacity.connect('value-changed', () => this.settings.set_int("inactive-opacity", opacity.get_value()));

    /*** Hotkeys ***/
    let label = new Gtk.Label({
        label: 'Float Window:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(label, 0, 5, 1, 1);

    let floatEntry = new Gtk.Entry({
        visible: true
    });
    floatEntry.set_text(this.settings.get_strv("float-window")[0]);
    prefsWidget.attach(floatEntry, 1, 5, 1, 1);
    floatEntry.connect('changed', () => this.settings.set_strv("float-window", [floatEntry.get_text()]));

    label = new Gtk.Label({
        label: 'Rotate Windows:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(label, 0, 6, 1, 1);

    let rotateEntry = new Gtk.Entry({
        visible: true
    });
    rotateEntry.set_text(this.settings.get_strv("rotate-windows")[0]);
    prefsWidget.attach(rotateEntry, 1, 6, 1, 1);
    rotateEntry.connect('changed', () => this.settings.set_strv("rotate-window", [rotateEntry.get_text()]));

    // Return our widget which will be added to the window
    return prefsWidget;
}
