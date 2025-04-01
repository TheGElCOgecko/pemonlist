// this code is copied and modified from list.js

const leaderboardSearchLogger = new Logger("Leaderboard", "Search");

const players = document.querySelectorAll(".players .table a");
const leaderboardSearchWorker = new Worker("/static/js/workers/search.js", { type : "module" });

function parseNode(node) {
    return {
        hidden: node.attributes.hidden,
        children: [
            node.children[1].innerText.replace(/\n/g, ""),
            node.children[2].lastElementChild.innerText.replace(/\n/g, "")
        ]
    };
}

leaderboardSearchWorker.postMessage("initialise"); // run the worker to prepare it for later

let loading = 0;

getCurrentTranslation().then(translation => {
    const copiedPlayers = Array.from(players).map(parseNode);

    document.querySelector(".search textarea").addEventListener("input", async event => {
        const start = Date.now();

        // search algorithm

        loading++;

        document.querySelector(".search span").classList.add("loading");

        const term = event.target.value.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");

        leaderboardSearchWorker.postMessage({
            term,
            options: copiedPlayers,
            start
        });

        leaderboardSearchWorker.onmessage = message => {
            const { data } = message;

            if (data.term != term) {
                loading--;
                return leaderboardSearchLogger.warn(`Worker sent results for term "${data.term}", was looking for term "${term}"`);
            }

            data.options.forEach((e, i) => {
                const player = players[i];

                player.hidden = e.hidden;

                player.children[1].innerHTML = e.children[0];
                player.children[2].lastElementChild.innerHTML = e.children[1];
            });

            loading--;

            document.querySelector(".search span").classList.toggle("loading", loading);

            // stats

            searchInfo.classList.toggle("visible", event.target.value);

            const elapsed = Date.now() - start;
            const status = !data.term ? "refresh" : `"${data.term}"`;

            if (elapsed > 20) leaderboardSearchLogger.warn(`${status} took ${elapsed}ms`);
            else leaderboardSearchLogger.log(`processing for ${status} processing took ${elapsed}ms`);

            if (!event.target.value) return;

            const seconds = Math.round(elapsed / 10) / 100;

            searchInfo.innerHTML = `${format(translation.search.results[data.countedOptions == 1 ? "s" : "p"], `<b>${data.countedOptions}</b>`)}${format(translation.search.seconds[seconds == 1 ? "s" : "p"], `<b>${seconds}</b>`)}`;
        };
    });
});
