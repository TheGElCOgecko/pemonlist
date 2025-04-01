const listButton = document.querySelector(".select button:nth-child(1)");
const extendedButton = document.querySelector(".select button:nth-child(2)");
const legacyButton = document.querySelector(".select button:nth-child(3)");

const search = document.querySelector(".search");

const listSearchLogger = new Logger("List", "Search");

const levels = document.querySelectorAll(".level");
const listSearchWorker = new Worker("/static/js/workers/search.js", { type : "module" });

function parseNode(node) {
    return {
        hidden: node.attributes.hidden,
        children: [
            node.children[2].innerText.replace(/\n/g, ""),
            node.children[1].children[0].innerText.replace(/\n/g, ""),
            node.children[1].children[1].innerText.replace(/\n/g, "")
        ]
    };
}

listSearchWorker.postMessage("initialise"); // run the worker to prepare it for later

let loading = 0;

getCurrentTranslation().then(translation => {
    const copiedLevels = Array.from(levels).map(parseNode);

    document.querySelector(".search textarea").addEventListener("input", async event => {
        const start = Date.now();

        // search algorithm

        loading++;

        search.classList.toggle("loading", loading);

        const term = event.target.value.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");

        listSearchWorker.postMessage({
            term,
            options: copiedLevels,
            start
        });

        listSearchWorker.onmessage = message => {
            const { data } = message;

            if (data.term != term) {
                loading--;
                return listSearchLogger.warn(`Worker sent results for term "${data.term}", was looking for term "${term}"`);
            }

            data.options.forEach((e, i) => {
                const level = levels[i];

                level.hidden = e.hidden;

                level.children[2].innerHTML = e.children[0];
                level.children[1].children[0].innerHTML = e.children[1];
                level.children[1].children[1].innerHTML = e.children[2];
            });

            loading--;

            search.classList.toggle("loading", loading);

            // stats

            searchInfo.classList.toggle("visible", event.target.value);

            const elapsed = Date.now() - start;
            const status = !data.term ? "refresh" : `"${data.term}"`;

            if (elapsed > 30) listSearchLogger.warn(`${status} took ${elapsed}ms`);
            else listSearchLogger.log(`processing for ${status} processing took ${elapsed}ms`);

            if (!event.target.value) return;

            const seconds = Math.round(elapsed / 10) / 100;

            searchInfo.innerHTML = `${format(translation.search.results[data.countedOptions == 1 ? "s" : "p"], `<b>${data.countedOptions}</b>`)}${format(translation.search.seconds[seconds == 1 ? "s" : "p"], `<b>${seconds}</b>`)}`;
        };
    });
});

const imgLogger = new Logger("List", "ImageLoader");

document.querySelectorAll(".level .img img").forEach(img => img.onload = handleImageLoad);

async function handleImageLoad(e) {
    if (e.target.naturalWidth != 120) return;
    const videoid = e.target.src.match(/\/vi\/([^\/]+)/)[1];
    const res = e.target.src.match(/\/(\w+)default\.jpg$/)[1].toLowerCase();
    const split = e.target.src.split(/\w+(default\.jpg)$/);
    split.pop();

    switch (res) {
        case "maxres":
            imgLogger.warn("Video ID", videoid, "failed to load MAXRES, falling back to SD");
            e.target.src = split.join("sd");
            break;
        case "sd":
            imgLogger.warn("Video ID", videoid, "failed to load SD, falling back to HQ");
            e.target.src = split.join("hq");
            break;
    }
}

listButton.addEventListener("click", () => {
    document.body.scrollTo({ top: document.querySelector(".level").offsetTop - 90, behavior: "smooth" });
});

extendedButton.addEventListener("click", () => {
    document.body.scrollTo({ top: document.querySelector(".extended").offsetTop - 90, behavior: "smooth" });
});

legacyButton.addEventListener("click", () => {
    document.body.scrollTo({ top: document.querySelector(".legacy").offsetTop - 90, behavior: "smooth" });
});
