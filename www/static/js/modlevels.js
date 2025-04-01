const selector = document.querySelector("span.selector");
const select = selector.querySelector("div");
const edit = selector.querySelector("button:first-child");
const add = selector.querySelector("button:last-child");
const search = document.querySelector("div.search");
const preview = document.querySelector("form.preview");
const submit = document.querySelector("div.submit");
const input = search.querySelector("input");
const levelnodes = {
    creator: preview.querySelector(".users p:first-of-type input"),
    levelId: preview.querySelector(".info .id p input"),
    name: preview.querySelector("h1 span:last-child input"),
    placement: preview.querySelector("h1 span:first-child input"),
    verifier: preview.querySelector(".users span:last-child"),
    verifierName: preview.querySelector(".users span:last-child p input"),
    video: preview.querySelector("iframe"),
    videourl: preview.querySelector(".info p input")
};

// snap box to top
document.body.addEventListener("scroll", () => {
    const bound = selector.getBoundingClientRect();
    select.classList.toggle("snap", bound.top <= 90 - (bound.height / 2 - 82));
}, { passive: true });

getCurrentTranslation().then(translation => {
    edit.addEventListener("click", e => {
        if (e.target.className == "selected") return;

        e.target.className = "selected";
        add.className = "";

        input.value = "";
        submit.children[0].value = translation.mods.levels.submit;

        search.classList.add("visible");
        preview.classList.remove("visible");
        submit.classList.remove("visible");
    });

    add.addEventListener("click", e => {
        if (e.target.className == "selected") return;

        e.target.className = "selected";
        edit.className = "";

        submit.children[0].value = translation.mods.levels.add;

        preview.classList.add("visible");
        search.classList.remove("visible");
        submit.classList.add("visible");

        preview.dataset.id = "";
        levelnodes.creator.value = "";
        levelnodes.levelId.value = "";
        levelnodes.name.value = "";
        levelnodes.placement.value = "";
        levelnodes.verifier.dataset.id = "";
        levelnodes.verifierName.value = "";
        levelnodes.video.src = "";
        levelnodes.videourl.value = "";

        document.querySelectorAll("input.changed").forEach(e => e.classList.remove("changed"));

        levelnodes.creator.dispatchEvent(new Event("input"));
        levelnodes.levelId.dispatchEvent(new Event("input"));
        levelnodes.name.dispatchEvent(new Event("input"));
        levelnodes.placement.dispatchEvent(new Event("input"));
        levelnodes.verifierName.dispatchEvent(new Event("input"));
        levelnodes.videourl.dispatchEvent(new Event("input"));
    });

    input.addEventListener("change", async e => {
        const option = search.querySelector(`datalist option[value="${e.target.value}"], .options button[value="${e.target.value}"]`);

        if (!option) {
            preview.classList.remove("visible");
            submit.classList.remove("visible");

            return;
        }

        preview.dataset.id = option.dataset.id;
        levelnodes.creator.value = option.dataset.creator;
        levelnodes.levelId.value = option.dataset.levelId;
        levelnodes.name.value = option.dataset.name;
        levelnodes.placement.value = option.dataset.placement;
        levelnodes.verifier.dataset.id = option.dataset.verifierId;
        levelnodes.verifierName.value = option.dataset.verifierName;
        levelnodes.video.src = "https://www.youtube-nocookie.com/embed/" + option.dataset.videoId;
        levelnodes.videourl.value = "https://youtube.com/watch?v=" + option.dataset.videoId;

        Object.keys(levelnodes).forEach(e => {
            if (!levelnodes[e].value) return;
            levelnodes[e].dataset.original = levelnodes[e].value;
        });

        levelnodes.creator.dataset.original = levelnodes.creator.value;
        levelnodes.levelId.dataset.original = levelnodes.levelId.value;
        levelnodes.name.dataset.original = levelnodes.name.value;
        levelnodes.placement.dataset.original = levelnodes.placement.value;
        levelnodes.verifierName.dataset.original = levelnodes.verifierName.value;
        levelnodes.videourl.dataset.original = levelnodes.videourl.value;

        preview.classList.add("visible");
        submit.classList.add("visible");

        levelnodes.creator.dispatchEvent(new Event("input"));
        levelnodes.levelId.dispatchEvent(new Event("input"));
        levelnodes.name.dispatchEvent(new Event("input"));
        levelnodes.placement.dispatchEvent(new Event("input"));
        levelnodes.verifierName.dispatchEvent(new Event("input"));
        levelnodes.videourl.dispatchEvent(new Event("input"));
    });

    levelnodes.levelId.addEventListener("input", e => {
        const span = e.target.parentElement.parentElement.parentElement;

        if (!e.target.value.trim()) return span.style.backgroundImage = "";

        span.style.backgroundImage = `url(https://raw.githubusercontent.com/cdc-sys/level-thumbnails/main/thumbs/${e.target.value}.png)`;
    });

    levelnodes.videourl.addEventListener("input", e => {
        const videoID = getVideoIDFromURL(e.target.value);

        e.target.setCustomValidity("");

        if (!videoID) e.target.setCustomValidity(translation.mods.levels.videoError);
        levelnodes.video.src = "https://www.youtube-nocookie.com/embed/" + videoID;
    });

    function handleInputChange(e) {
        const input = e.target;

        // automatically change the size of an input based on its contents.
        const test = document.createElement("span");
        test.className = "test";
        test.innerText = !input.value.trim() ? input.placeholder : input.value;
        input.parentElement.appendChild(test);

        let { width } = test.getBoundingClientRect();

        test.remove();

        if (input.type == "number") width += (20 * !touch);
        if (input.list) width += 25;
        input.style.width = width + "px";

        if (document.querySelector(".selector div button.selected").dataset.method == "editlevel") {
            // add an asterisk if the content differs from the original
            input.classList.toggle("changed", input.dataset.original != input.value);

            // set submit button
            submit.children[0].disabled = !document.querySelector(".preview input.changed");
        }

        if (document.querySelector(".selector div button.selected").dataset.method == "addlevel") {
            // set submit button
            submit.children[0].disabled = false;

            preview.querySelectorAll("input").forEach(e => {
                if (!e.checkValidity()) submit.children[0].disabled = true;
            });
        }
    }

    levelnodes.creator.addEventListener("input", handleInputChange);
    levelnodes.levelId.addEventListener("input", handleInputChange);
    levelnodes.name.addEventListener("input", handleInputChange);
    levelnodes.placement.addEventListener("input", handleInputChange);
    levelnodes.verifierName.addEventListener("input", handleInputChange);
    levelnodes.videourl.addEventListener("input", handleInputChange);

    submit.children[0].addEventListener("click", async () => {
        const payload = {
            creator: levelnodes.creator.value,
            id: preview.dataset.id,
            levelid: levelnodes.levelId.value,
            name: levelnodes.name.value,
            placement: levelnodes.placement.value,
            verifiername: levelnodes.verifierName.value,
            videoid: getVideoIDFromURL(levelnodes.videourl.value),
        };
        const { method } = document.querySelector(".selector div button.selected").dataset;

        const newverifier = !document.querySelector(`#players option[value="${levelnodes.verifierName.value}"]`);

        if (!newverifier) return createFormAndPost(`/mod/${method}`, payload);

        const cover = document.createElement("div");
        cover.className = "cover";

        const modal = document.createElement("div");
        modal.className = "modal";

        const header = document.createElement("h1");
        header.innerText = translation.mods.levels.modal.head;

        const body = document.createElement("p");
        body.innerText = `${translation.mods.levels.modal.confirmation[0]}${format(translation.mods.levels.modal.confirmation[1], levelnodes.verifierName.value)}`;

        const input = document.createElement("span");

        const yes = document.createElement("button");
        yes.innerText = translation.mods.levels.modal.confirm;
        yes.classList.add("catastrophic");

        const no = document.createElement("button");
        no.innerText = translation.mods.levels.modal.deny;

        input.append(yes, no);
        modal.append(header, body, input);
        cover.appendChild(modal);
        document.body.appendChild(cover);

        await frame();

        async function hide(e) {
            if (e.target != cover && e.target != yes) return;

            cover.classList.remove("visible");
            modal.classList.remove("visible");

            await ms(200);

            cover.remove();
        }

        cover.addEventListener("click", hide);
        yes.addEventListener("click", () => createFormAndPost(`/mod/${method}`, payload));
        no.addEventListener("click", hide);

        cover.classList.add("visible");
        modal.classList.add("visible");
    });
});
