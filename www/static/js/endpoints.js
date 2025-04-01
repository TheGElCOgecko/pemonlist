window.addEventListener("load", async () => {
    if (document.getElementById(location.hash.slice(1)))
        document.body.scrollTo({
            top: document.getElementById(location.hash.slice(1)).offsetTop - 90,
            behavior: "instant"
        });

    await new Promise(r => setTimeout(r, 0));
    window.dispatchEvent(new Event("resize"));
});

window.addEventListener("hashchange", () =>
    document.getElementById(location.hash.slice(1))
        ? document.body.scrollTo({
            top: document.getElementById(location.hash.slice(1)).offsetTop - 90,
            behavior: "instant"
        })
        : null
);

document.querySelectorAll(".table a").forEach(e => e.addEventListener("click", () => {
    const endpoint = e.getAttribute("endpoint");

    history.pushState({}, "", `#${endpoint}`);

    document.body.scrollTo({
        top: document.getElementById(endpoint).offsetTop - 90,
        behavior: "smooth"
    });
}));

document.querySelectorAll("#origin").forEach(o => o.innerText = location.origin);
document.querySelectorAll("#hostname").forEach(o => o.innerText = location.hostname);

const details = document.querySelectorAll("details");

details.forEach(e => e.addEventListener("click", async () => {
    await new Promise(r => setTimeout(r, 0));
    window.dispatchEvent(new Event("resize"));
}));

document.querySelectorAll(".endpoint").forEach(e => {
    const split = e.id.split("/");

    const explorer = e.lastElementChild.lastElementChild;
    const output = explorer.lastElementChild.firstElementChild;
    const inputs = explorer.firstElementChild.lastElementChild;

    const execute = inputs.lastElementChild;
    const reset = inputs.firstElementChild

    // scoped version input
    ;(() => {
        const input = document.createElement("input");
        input.id = "?version";
        input.type = "text";
        input.placeholder = "?version";

        input.addEventListener("keyup", e => {
            if (e.key == "Enter") execute.click();
        });

        output.parentElement.insertAdjacentElement("beforeBegin", input);
    })();

    if (e.getAttribute("search")) e.getAttribute("search").split(",").forEach(e => {
        const input = document.createElement("input");
        input.id = `?${e}`;
        input.type = "text";
        input.placeholder = `?${e}`;

        input.addEventListener("keyup", e => {
            if (e.key == "Enter") execute.click();
        });

        output.parentElement.insertAdjacentElement("beforeBegin", input);
    });

    split.forEach(e => {
        if (!/^:/.test(e)) return;

        const input = document.createElement("input");
        input.id = e;
        input.type = "text";
        input.placeholder = e;

        input.addEventListener("keyup", e => {
            if (e.key == "Enter") execute.click();
        });

        output.parentElement.insertAdjacentElement("beforeBegin", input);
    });

    execute.addEventListener("click", async () => {
        output.innerHTML = "Fetching...";

        const path = Array(...split); // create a deep copy instead of a reference
        const search = new URLSearchParams();

        explorer.querySelectorAll("input").forEach(input => {
            switch (input.id.slice(0, 1)) {
                case ":":
                    path.forEach((e, i) => {
                        if (e == input.id) return path[i] = input.value || input.id.slice(1);
                    });
                    break;
                case "?":
                    if (input.value) search.set(input.id.slice(1), input.value);
            }
        });

        console.log(search);

        const url = `${location.origin}${path.join("/")}${search.size ? "?" : ""}${search.toString()}`;

        try {
            const request = await fetch(url, { headers: {
                "User-Agent": "+PemonlistAPIDocsExplorer/1.0"
            } }).then(a => a.text());

            if (/^[\{\[]/.test(request)) { // format as json if needed
                output.innerHTML = hljs.highlightAuto(JSON.stringify(
                    JSON.parse(request),
                    null,
                    4
                )).value;
                return;
            }

            output.innerHTML = hljs.highlightAuto(request).value;
        } catch (e) {
            output.innerHTML = `An error occurred! ${e}`;
            console.error(e);
        }

        reset.classList.remove("hidden");
    });

    reset.addEventListener("click", () => {
        output.innerHTML = "The result will show up here...";
        reset.classList.add("hidden");
    });
});

document.querySelectorAll(".endpoint details").forEach(e =>
    e.firstElementChild.innerText += ` (${e.querySelectorAll("span:not(.title) > code").length})`
);
