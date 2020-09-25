export class Logging {
    logLevel: number;
    fileName: string;

    constructor(level: number, fileName: string) {
        this.logLevel = level;
        this.fileName = fileName || 'tidalwm';
        this.log(`logging.js: log level set to ${this.logLevel}`);
    }

    verbose(msg: string) {
        if (this.logLevel >= 2) {
            this.log(`[VERBOSE] ${this.fileName}: ${msg}`);
        }
    }

    debug(msg: string) {
        if (this.logLevel >= 1) {
            this.log(`[DEBUG] ${this.fileName}: ${msg}`);
        }
    }

    log(msg: string) {
        if (this.logLevel >= 0) {
            // @ts-ignore
            global.log(`${this.fileName}: ${msg}`)
        }
    }
}
