export class Logger {
    prefix = "";

    constructor(...prefixes) {
        prefixes.map(p => p.split(" ").map(s => (s[0].toUpperCase() + s.slice(1))).join(" "));
        this.prefix = `[${prefixes.join("] [")}]`;
    }

    debug(...content) {
        console.debug(`%c${this.prefix}`, "color:rgb(175,0,175)", ...content);
    }

    error(...content) {
        console.error(`${this.prefix}`, ...content);
    }

    info(...content) {
        console.info(`%c${this.prefix}`, "color:rgb(175,0,175)", ...content);
    }

    log(...content) {
        console.log(`%c${this.prefix}`, "color:rgb(175,0,175)", ...content);
    }

    warn(...content) {
        console.warn(`${this.prefix}`, ...content);
    }

    table(...content) {
        console.table(...content);
    }

    group(...content) {
        console.group(`%c${this.prefix}`, "color:rgb(175,0,175)", ...content);
    }

    groupCollapsed(...content) {
        console.groupCollapsed(`%c${this.prefix}`, "color:rgb(175,0,175)", ...content);
    }

    groupEnd() {
        console.groupEnd();
    }
}
