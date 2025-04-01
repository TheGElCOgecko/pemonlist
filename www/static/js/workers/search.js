import { Logger } from "./logger.js";

String.prototype.highlight = function(term) {
    return this.replace(new RegExp(`(${term})`, "ig"), '<span class="highlight">$1</span>');
};

const searchWorkerLogger = new Logger("Worker", "Search");

self.onmessage = function (message) {
    const { data } = message;

    if (data == "initialise") return;

    const start = Date.now();
    const { options } = data;
    let countedOptions;

    if (!data.term) options.forEach(e => e.hidden = false);
    else {
        const map = options.flatMap(e => e.children);

        const children = options[0].children.length;

        const availableIndices = map.reduce(function(a, e, i) {
            if (new RegExp(data.term, "i").test(e)) a.add(Math.floor(i / children));
            return a;
        }, new Set());

        countedOptions = availableIndices.size;

        console.log(availableIndices);

        options.forEach((e, i) => {
            if (!availableIndices.has(i)) e.hidden = true;
            else e.hidden = false;

            for (const i in e.children) {
                const value = e.children[i];
                if (new RegExp(data.term, "i").test(value)) e.children[i] = value.highlight(data.term);
            }
        });
    }

    const elapsed = Date.now() - start;
    const status = !data.term ? "refresh" : `"${data.term}"`;

    if (elapsed > 20) searchWorkerLogger.warn(`${status} took ${elapsed}ms`);
    else searchWorkerLogger.log(`search for ${status} took ${elapsed}ms`);

    self.postMessage({ term: data.term, options, countedOptions });
};
