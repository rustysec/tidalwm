// @ts-ignore
const ExtensionUtils = imports.misc.extensionUtils;
// @ts-ignore
const Gio = imports.gi.Gio;
// @ts-ignore
const Me = ExtensionUtils.getCurrentExtension();

// @ts-ignore
const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.tidalwm';

// @ts-ignore
interface GnomeSettings extends GObject.Object { // @ts-ignore
    get_boolean(key: string): boolean;
    set_boolean(key: string, value: boolean): void;

    get_int(key: string): number;
    get_uint(key: string): number;
    set_uint(key: string, value: number): void;

    get_string(key: string): string;
}

export class Settings {
    private _settings: GnomeSettings;

    constructor() {
        let gschema = Gio.SettingsSchemaSource.new_from_directory(
            Me.dir.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        );

        this._settings = new Gio.Settings({
            settings_schema: gschema.lookup(SETTINGS_SCHEMA, true)
        });
    }

    logLevel(): number {
        return this._settings.get_uint('log-level');
    }

    smartGaps(): boolean {
        return this._settings.get_boolean('smart-gaps');
    }

    gaps(): number {
        return this._settings.get_int('window-gaps');
    }

    initialDirection(): number {
        return this._settings.get_int("initial-direction");
    }

    tileDialogs(): boolean {
        return false;
    }
}

