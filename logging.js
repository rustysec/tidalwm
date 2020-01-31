var Logging = class LoggingClass {
    constructor(settings) {
        this.settings = settings;
        this.logLevel = this.settings.get_int("log-level") || 0;
        this.settings.connect
    }

    verbose(msg) {
        if (this.logLevel >= 2) {
            log(`[VERBOSE] ${msg}`);
        }
    }

    debug(msg) {
        if (this.logLevel >= 1) {
            log(`[DEBUG] ${msg}`);
        }
    }

    log(msg) {
        if (this.logLevel >= 0) {
            log(msg)
        }
    }
}
