import fs from "fs";

let errors = false;

const args = {
    c: false,
    i: false,
    first: null,
    second: null
};

// remove cmd info
const argv = process.argv.slice(2);

for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (/^-\w+$/.test(arg)) {
        for (const ident of arg.slice(1).split("")) {
            if (typeof args[ident] === "undefined") throw `Arg supplied is not valid: ${arg}`;

            args[ident] = !args[ident];
        }
    }

    if (/^--\w+$/.test(arg)) {
        const ident = arg.slice(2);
        if (typeof args[ident] === "undefined") throw `Arg supplied is not valid: ${arg}`;
        if (typeof argv[i + 1] === "undefined") throw `Arg has no value: ${arg}`;

        const value = argv[i + 1];

        if (!isNaN(Number(value))) args[ident] = Number(value);

        else if (value === "true") args[ident] = true;
        else if (value === "false") args[ident] = false;

        else args[ident] = value;
    }
}

function run(first, second) {
    const original = require(`./${first}.json`);
    const check = require(`./${second}.json`);

    if (!original || !check) throw "language file does not exist";

    const keys = [];

    function checkKeys(json) {
        for (const key of Object.keys(json)) {
            keys.push(key);

            let value = check;
            keys.every(k => {
                if (typeof value[k] === "undefined") {
                    console[second === (args.first ?? "en") ? "warn" : "error"](`\x1b[${second === (args.first ?? "en") ? "33" : "31"}mjson${keys.map(e => isNaN(Number(e)) ? `["${e}"]` : `[${e}]`).join("")} does not exist on \x1b[4m${second}.json\x1b[24m!\x1b[0m`);
                    errors = true;
                } else {
                    value = value[k];
                    if (!args.c) return true;
                    if (typeof value === "object" || second === (args.first ?? "en")) return true;
                    if (value === json[key]) {
                        console.warn(`\x1b[33mjson${keys.map(e => isNaN(Number(e)) ? `["${e}"]` : `[${e}]`).join("")} on \x1b[4m${second}.json\x1b[24m is the same as ${first}.json!\x1b[0m`);
                        errors = true;
                    }
                    return true;
                }
            });

            if (typeof json[key] === "object") checkKeys(json[key]);

            keys.pop();
        }
    }

    checkKeys(original);

    if (second === (args.first ?? "en")) return;
    if (!args.i) return;

    const originalInputs = JSON.stringify(original).match(/{}/g)?.length;
    const inputs = JSON.stringify(check).match(/{}/g)?.length;

    if (originalInputs !== inputs) console.error(`\x1b[31m\x1b[4m${second}.json\x1b[24m has ${inputs} inputs instead of ${originalInputs}\x1b[0m`);
}

if (args.second) {
    run(args.first ?? "en", args.second);
    run(args.second, args.first ?? "en");
} else fs.readdirSync("./site/translations").forEach(f => {
    if (!f.endsWith(".json")) return;
    if (f.startsWith(args.first ?? "en")) return;

    console.info(`\x1b[36mChecking ${f}\x1b[0m`);

    run(args.first ?? "en", f.split(".")[0]);
    run(f.split(".")[0], args.first ?? "en");
});

if (!errors) console.info("\x1b[36mAll good!\x1b[0m");
