const username = document.getElementById("name");
const deletebtn = document.querySelector(".delete");
const profileshape = document.querySelector(".profile .select select");
const img = document.querySelector(".profile .img img");
const snowcheck = document.getElementById("snow");

username.addEventListener("input", async e => {
    e.target.setCustomValidity("");

    const translation = await getCurrentTranslation();

    if (e.target.value.trim().length > 25 || e.target.value.trim().length == 0) return e.target.setCustomValidity(translation.settings.nameError.join("\n"));
});

deletebtn.addEventListener("click", async e => {
    e.preventDefault();

    const translation = await getCurrentTranslation();

    const cover = document.createElement("div");
    cover.className = "cover";

    const modal = document.createElement("div");
    modal.className = "modal";

    const header = document.createElement("h1");
    header.innerText = translation.settings.modal.head;

    const body = document.createElement("p");
    body.innerText = translation.settings.modal.confirmation.join("\n");

    const disclaimer = document.createElement("p");
    disclaimer.innerText = translation.settings.modal.disclaimer;
    disclaimer.className = "disclaimer";

    const input = document.createElement("span");

    const yes = document.createElement("button");
    yes.innerText = translation.settings.modal.confirm;
    yes.className = "catastrophic";

    const no = document.createElement("button");
    no.innerText = translation.settings.modal.deny;

    input.append(yes, no);
    body.appendChild(disclaimer);
    modal.append(header, body, input);
    cover.appendChild(modal);
    document.body.appendChild(cover);

    await frame();

    async function hide(e) {
        if (e.target != cover && e.target != no) return;

        cover.classList.remove("visible");
        modal.classList.remove("visible");

        await ms(200);

        cover.remove();
    }

    cover.addEventListener("click", hide);
    no.addEventListener("click", hide);
    yes.addEventListener("click", async () => {
        deletebtn.parentElement.submit();
    });

    cover.classList.add("visible");
    modal.classList.add("visible");
});

username.dispatchEvent(new Event("input"));

profileshape.addEventListener("change", e => {
    img.classList.value = "pfp " + e.target.value[0].toUpperCase() + e.target.value.slice(1);
});

snowcheck.checked = cookies.snow;
snowcheck.addEventListener("change", () => {
    cookies.set("snow", snowcheck.checked);
    switch (snowcheck.checked) {
        case true:
            startSnow();
            break;
        case false:
            stopSnow();
            break;
    }
});
