const username = document.getElementById("username");
const img = document.querySelector(".profile img");
const select = document.querySelector(".profile select");

username.addEventListener("input", async e => {
    e.target.setCustomValidity("");

    const translation = await getCurrentTranslation();

    if (e.target.value.trim().length > 25 || e.target.value.trim().length == 0) return e.target.setCustomValidity(translation.settings.nameError.join("\n"));
});

username.dispatchEvent(new Event("input"));

switch (mobile) {
    case true:
        document.querySelector('#device option[value="mobile"]').selected = true;
    default:
        document.querySelector('#device option[value="desktop"]').selected = true;
}
