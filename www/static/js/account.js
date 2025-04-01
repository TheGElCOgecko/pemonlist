const id = document.querySelector(".info .id p");

if (id != null) id.addEventListener("click", async e => {
    const exists = document.querySelector(".copied");

    const translation = await getCurrentTranslation();

    if (exists) exists.remove();

    const copied = document.createElement("div");
    copied.classList.value = "copied";
    copied.innerText = translation.account.copied;

    await navigator.clipboard.writeText(id.firstChild.data);

    document.querySelector(".info .id").appendChild(copied);
    await frame();
    copied.classList.toggle("open");

    await ms(2200);

    copied.style.transitionTimingFunction = "cubic-bezier(0.55, 0.06, 0.68, 0.19)";
    await frame();
    copied.classList.toggle("open");

    await ms(200);

    copied.remove();
});

document.querySelectorAll(".table div .reason").forEach(e => e.addEventListener("click", async e => {
    const translation = await getCurrentTranslation();

    const cover = document.createElement("div");
    cover.className = "cover";

    const modal = document.createElement("div");
    modal.className = "modal";

    const header = document.createElement("h1");
    header.innerText = translation.account.pending.denial.denial;

    const body = document.createElement("p");
    if (!e.target.dataset.reason) {
        body.innerText = translation.account.pending.denial.empty;
        body.classList.add("empty");
    } else body.innerText = `"${e.target.dataset.reason}"`;

    const input = document.createElement("span");

    const ok = document.createElement("button");
    ok.innerText = translation.account.pending.denial.confirm;

    const del = document.createElement("button");
    del.innerText = translation.account.pending.denial.delete;
    del.classList.add("catastrophic");

    input.append(del, ok);
    modal.append(header, body, input);
    cover.appendChild(modal);
    document.body.appendChild(cover);

    await frame();

    async function hide(e) {
        if (e.target != cover && e.target != ok) return;

        cover.classList.remove("visible");
        modal.classList.remove("visible");

        await ms(200);

        cover.remove();
    }

    cover.addEventListener("click", hide);
    ok.addEventListener("click", hide);
    del.addEventListener("click", () => createFormAndPost("/account", {
        id: e.target.dataset.id,
        method: "deleterecord"
    }));

    cover.classList.add("visible");
    modal.classList.add("visible");
}));
