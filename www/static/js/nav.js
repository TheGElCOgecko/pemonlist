const full = document.querySelector("nav .full");
const overflow = document.querySelector("nav button.overflow");
const overflowNav = document.querySelector("div.overflow");
const language = document.querySelector("nav .language");

const query = window.matchMedia(`(max-width: ${full.getBoundingClientRect().width + 420}px)`);

query.addEventListener("change", () => {
    overflow.classList.remove("enabled");
    overflowNav.classList.remove("enabled");

    full.style.display = query.matches ? "none" : "flex";
    overflow.style.display = !query.matches ? "none" : "flex";
    overflowNav.style.display = !query.matches ? "none" : "flex";
});

query.dispatchEvent(new Event("change"));

function checkModalsShouldClose(e) {
    if (document.querySelector("nav").contains(e.target)
    || document.querySelector("div.overflow").contains(e.target)
    || languageNav.contains(e.target)) return;

    overflow.classList.remove("enabled");
    overflowNav.classList.remove("enabled");

    language.classList.remove("enabled");
    languageNav.classList.remove("enabled");
}

document.addEventListener("click", checkModalsShouldClose);
document.addEventListener("touchstart", checkModalsShouldClose);

overflow.addEventListener("click", () => {
    const enabled = overflowNav.classList.toggle("enabled");
    overflow.classList.toggle("enabled", enabled);

    language.classList.remove("enabled");
    languageNav.classList.remove("enabled");
});

const languageNav = document.createElement("div");
languageNav.className = "language";

for (const code of Object.keys(languages)) {
    const language = languages[code];

    const elem = document.createElement("button");
    elem.dataset.code = code;
    if (code == cookies.lang) elem.className = "current";

    const flag = document.createElement("img");
    flag.src = `https://flagicons.lipis.dev/flags/4x3/${language.flag}.svg`;
    flag.alt = language.flag.toUpperCase();
    flag.title = language.flag.toUpperCase();

    const text = document.createElement("p");
    text.innerText = language.name;

    elem.append(flag, text);

    languageNav.appendChild(elem);
}

document.body.appendChild(languageNav);

language.addEventListener("click", () => {
    const enabled = languageNav.classList.toggle("enabled");
    language.classList.toggle("enabled", enabled);

    overflow.classList.remove("enabled");
    overflowNav.classList.remove("enabled");
});

languageNav.addEventListener("click", e => {
    const code = e.target.dataset.code ?? e.target.parentElement.dataset.code;
    if (!code) return;

    cookies.set("lang", code);
    location.reload();
});
