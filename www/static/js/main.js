class Logger {
    prefix = "";

    constructor(...prefixes) {
        prefixes.map(p => p.split(" ").map(s => (s[0].toUpperCase() + s.slice(1))).join(" "));
        this.prefix = `[${prefixes.join("] [")}]`;
    }

    debug(...content) {
        console.debug(`%c${this.prefix}`, "color:rgb(175,0,175)", ...content);
    }

    error(...content) {
        console.error(`${this.prefix}`, ...content);
    }

    info(...content) {
        console.info(`%c${this.prefix}`, "color:rgb(175,0,175)", ...content);
    }

    log(...content) {
        console.log(`%c${this.prefix}`, "color:rgb(175,0,175)", ...content);
    }

    warn(...content) {
        console.warn(`${this.prefix}`, ...content);
    }

    table(...content) {
        console.table(...content);
    }

    group(...content) {
        console.group(`%c${this.prefix}`, "color:rgb(175,0,175)", ...content);
    }

    groupCollapsed(...content) {
        console.groupCollapsed(`%c${this.prefix}`, "color:rgb(175,0,175)", ...content);
    }

    groupEnd() {
        console.groupEnd();
    }
}

const mainLogger = new Logger("Main");



const cookies = {};
document.cookie.split("; ").forEach(c => {
    let value = c.split("=")[1];

    if (!isNaN(value)) value = parseFloat(value);
    else switch (value) {
        case "true":
        case "false":
            value = value == "true";
            break;
        default:
            decodeURIComponent(value);
    }

    cookies[c.split("=")[0]] = value;
});

cookies.set = (name, value, expires = new Date("2038").getTime()) => {
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${new Date(expires).toGMTString()}; path=/`;
    cookies[name] = value;
};



// language detection
const languages = {
    de: { // German
        name: "Deutsch",
        flag: "de"
    },
    en: { // English
        name: "English",
        flag: "gb"
    },
    es: { // Spanish
        name: "Español",
        flag: "es"
    },
    fr: { // French
        name: "Français",
        flag: "fr"
    },
    hu: { // Hungarian
        name: "Magyar nyelv",
        flag: "hu"
    },
    ko: { // Korean
        name: "한국어",
        flag: "kr"
    },
    nl: { // Dutch
        name: "Nederlands",
        flag: "nl"
    },
    // pl: { // Polish
    //     name: "Polski",
    //     flag: "pl"
    // },
    pt: { // Portuguese
        name: "Português",
        flag: "br"
    },
    sr: { // Serbian
        name: "Sprski",
        flag: "rs"
    }
};

function getPreferredUALanguage() {
    for (const language of navigator.languages.map(l => l.split("-")[0])) {
        if (Object.keys(languages).includes(language)) return language;
    }

    return "en";
}

if (!Object.keys(languages).includes(cookies.lang)) {
    const preferred = getPreferredUALanguage();
    cookies.set("lang", preferred);

    if (preferred != "en") location.reload();
}


let translation = null;
document.addEventListener("languageLoad", e => translation = e.detail);

async function getCurrentTranslation() {
    if (translation) return translation;
    return await new Promise(r => document.addEventListener("languageLoad", e => r(e.detail)));
}

// load language
fetch(`/translations/${cookies.lang}.json`)
    .then(r => r.json())
    .then(detail => document.dispatchEvent(new CustomEvent("languageLoad", { detail })))
    .catch(async () => {
        mainLogger.error("Could not load translation, reverting to English");

        const detail = await fetch("/translations/en.json")
            .then(r => r.json());
        document.dispatchEvent(new CustomEvent("languageLoad", { detail }));
    });

function format(string, ...input) {
    for (const str of input) {
        string = string.replace("{}", str);
    }
    return string;
}



let touch = false;

if ("ontouchstart" in window) {
    mainLogger.info("Device seems to be a touchscreen");
    document.body.classList.add("touch");
    touch = true;
}

const mobileDevices = [ "android", "webos", "iphone", "ipad", "ipod", "blackberry", "windows phone" ];
let mobile = false;

if (!navigator.userAgentData) {
    mainLogger.warn("navigator.userAgentData does not exist, checking against navigator.userAgent");

    mobileDevices.forEach(d => {
        const m = navigator.userAgent.match(new RegExp(d, "i")) != null;
        if (m) return mobile = true;
    });
} else mobile = navigator.userAgentData.mobile;

mainLogger.info(`Browser reporting device as a ${mobile ? "mobile" : "desktop"} device`);



function getVideoIDFromURL(url) {
    let parsedURL = null;

    try { parsedURL = new URL(url); } catch { return undefined; }

    if (parsedURL.hostname)

    // converting other URLs
    if (parsedURL.pathname == "/oembed")
        parsedURL = new URL(parsedURL.searchParams.get("url"));

    if (parsedURL.pathname == "/attribution_link")
        parsedURL = new URL(parsedURL.searchParams.get("u"), "https://youtube.com");


    // youtube.com/watch?v=dQw4w9WgXcQ
    if (parsedURL.searchParams.get("v")) {
        return parsedURL.searchParams.get("v");
    }

    // youtube.com/?vi=dQw4w9WgXcQ
    if (parsedURL.searchParams.get("vi")) {
        return parsedURL.searchParams.get("vi");
    }

    // checks for URL slugs like youtube.com/watch/dQw4w9WgXcQ or youtube.com/v/dQw4w9WgXcQ
    for (const slug of [ "embed", "e", "shorts", "live", "watch", "v", "vi" ]) {
        const match = parsedURL.pathname.match(new RegExp(`/${slug}/(.+)$`));
        if (match) return match[1]
            .split("&")[0] // protects `vi` from returning feature parameter
            .replace(/^\/?([^\/]+)\/?.*$/, "$1"); // removes preceding or trailing slug(s)
    }

    // youtube.com/user/GitHub#p/a/u/1/lalOy8Mbfdc
    if (parsedURL.hash.match(/#p\/(?:a\/)?u\/\d+\/.+$/)) {
        return parsedURL.hash.match(/#p\/(?:a\/)?u\/\d+\/(.+)$/)[1]
            .split("?")[0] // protects from returning rel parameter
            .replace(/^\/?([^\/]+)\/?.*$/, "$1"); // removes preceding or trailing slug(s)
    }

    // youtu.be/dQw4w9WgXcQ
    if (parsedURL.hostname.match(/youtu\.be/)) {
        return parsedURL.pathname.slice(1)
            .split("&")[0] // protects from returning feature parameter
            .replace(/^\/?([^\/]+)\/?.*$/, "$1"); // removes preceding or trailing slug(s)
    }
}



const ms = async ms => await new Promise(r => setTimeout(r, ms));
const frame = async () => await new Promise(r => requestAnimationFrame(r));

// fix datalists on Gecko engines
const gecko = /(?<!like )Gecko/i.test(navigator.userAgent);

if (gecko) {
    document.querySelectorAll("datalist").forEach(datalist => {
        const search = datalist.parentElement.classList.contains("search") ? datalist.parentElement : null;
        let loading = 0;

        const input = document.querySelector(`[list="${datalist.id}"]`);

        const container = document.createElement("span");
        container.className = "options";

        let hoveredTarget = null;
([...datalist.children].forEach(e => {
            const button = document.createElement("button");

            if (e.hasAttribute("value")) {
                const h3 = document.createElement("h3");
                h3.innerText = e.getAttribute("value");
                button.appendChild(h3);
            }

            if (e.hasAttribute("label")) {
                const p = document.createElement("p");
                p.innerText = e.getAttribute("label");
                button.appendChild(p);
            }

            ([...e.attributes].forEach(a => button.setAttributeNode(a.cloneNode())));

            container.appendChild(button);

            button.addEventListener("mouseenter", e => {
                hoveredTarget = e.target;
            }, { passive: true });

            button.addEventListener("mousedown", () => {
                if (!hoveredTarget) return;
                input.value = hoveredTarget.value;
                input.dispatchEvent(new Event("change"));
                input.dispatchEvent(new Event("input"));
            }, { passive: true });
        }));

        input.insertAdjacentElement("afterend", container);

        container.style.translate = "0px";

        function updateContainer(e) {
            if (e.type != "input" && e.type != "change") {
                const { bottom } = input.getBoundingClientRect();
                const inverted = bottom > (window.innerHeight + 70) * 0.5;

                container.classList.toggle("invert", inverted);

                if (inverted) container.style.maxHeight = bottom - input.clientHeight - 140 + "px";
                else container.style.maxHeight = window.innerHeight - bottom - 70 + "px";
            }

            if (e.type != "resize" && e.type != "scroll") {
                loading++;

                if (search) search.classList.toggle("loading", loading);

                const options = [...container.children];

                if (input.value == "") options.forEach(e => e.className = "");
                else {
                    const map = options.flatMap(e => [e.value, e.attributes.label ? e.attributes.label.value : null]);

                    const availableIndices = map.reduce(function(a, e, i) {
                        if (new RegExp(input.value.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&"), "i").test(e)) a.push(Math.floor(i / 2));
                        return a;
                    }, []);

                    options.forEach((e, i) => {
                        e.className = availableIndices.includes(i) ? "" : "hidden";
                    });
                }

                container.classList.toggle("center", input.clientWidth + 20 < container.clientWidth);


                loading--;

                if (search) search.classList.toggle("loading", loading);
            }

            // FIXME - make container fit bounds of screen
        }

        window.addEventListener("resize", updateContainer, { passive: true });
        document.body.addEventListener("scroll", updateContainer, { passive: true });

        input.addEventListener("focusin", updateContainer, { passive: true }); // to properly update the size when focusing (to deal with display rules)

        // updates width with resizing inputs
        input.addEventListener("input", updateContainer, { passive: true });
        input.addEventListener("change", updateContainer, { passive: true });
    });
}



// fix level datalist duplicates

const duplicates = [];

document.querySelectorAll("datalist#levels").forEach(d => [...d.children].forEach(o => {
    const count = d.querySelectorAll(`option[value="${o.value}"]`).length;
    if (count <= 1) return;
    duplicates.push(o);
}));

duplicates.forEach(o => {
    o.value += ` (${o.dataset.creator})`;
});



function createFormAndPost(action, payload = {}) {
    const form = document.createElement("form");
    form.method = "post";
    form.action = action;

    Object.keys(payload).forEach(k => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = payload[k];

        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
}



// cookies/terms warning
window.addEventListener("load", async () => {
    if (cookies.agree) return;
    if (location.pathname == "/oauth") return; // don't show up on the oauth page, it doesn't really fit well

    const translation = await getCurrentTranslation();

    const warning = document.createElement("div");
    warning.className = "warning";

    const text = document.createElement("span");
    text.className = "hidden";
    text.innerHTML = `<p>${ format(translation.agreement.text[0], `<a href="/terms" class="proper">${translation.agreement.terms}</a>`, `<a href="/privacy" class="proper">${translation.agreement.privacy}</a>`) }</p><p>${ translation.agreement.text[1] }</p><div class="gradient"></div>`;

    const ok = document.createElement("button");
    ok.innerText = translation.agreement.confirm;

    warning.append(text, ok);
    document.body.appendChild(warning);

    if (text.offsetHeight != text.scrollHeight) text.className = "";

    function checkBottom() {
        const bottom = text.scrollTop + text.offsetHeight == text.scrollHeight;
        text.classList.toggle("hidden", bottom);
    }

    text.addEventListener("scroll", checkBottom, { passive: true });
    window.addEventListener("resize", () => {
        const scrollable = text.offsetHeight == text.scrollHeight;
        text.classList.toggle("hidden", scrollable);
        if (scrollable) checkBottom();
    }, { passive: true });

    ok.addEventListener("click", async () => {
        warning.classList.remove("visible");

        await ms(300);

        warning.remove();
        cookies.set("agree", true);

        // reset the height variables
        window.dispatchEvent(new Event("resize"));
    });

    await frame();

    warning.classList.add("visible");

    await ms(300);

    // this pushes content up so we have to check again
    resetScrollable();
});

function resetScrollable() {
    document.documentElement.style.setProperty("--scrollbar-width", (window.innerWidth - document.body.scrollWidth) + "px");
}

window.addEventListener("load", () => {
    document.documentElement.style.setProperty("--scrollbar-width", (window.innerWidth - document.body.scrollWidth) + "px");
});

// update scrollbar
let lastInnerWidth = 0;

// move jump button down if enough clearance is available
window.addEventListener("resize", () => {
    if (window.innerWidth == lastInnerWidth) return;

    resetScrollable();

    lastInnerWidth = window.innerWidth;
}, { passive: true });

function percentToFloat(percent) {
    return 1 - (percent / 100);
}

// check if devtools has been opened
let opened = false;
function devtoolsopened() {
    if (opened || cookies.iknowwhatimdoing) return;
    opened = true;

    const interjection = (() => {
        const rnd = Math.random();
        if (rnd > percentToFloat(2)) return "Take that!"; // 2%
        if (rnd > percentToFloat(5 + 2)) return "Objection!"; // 5%
        return "Hold it!"; // 93%
    })();

    console.log(`%c${interjection}`, "font-size: 60px; color: #f00; -webkit-text-stroke: 2px #600; font-weight: 700; text-shadow: 2px 3px #600, 1px 2px #600; background: #fff; padding: 0px 10px; border-radius: 20px;");
    console.log("%cBe careful with the devtools. If someone told you to paste or write something here, don't listen to them unless you know what you're doing!", "color: #fc6");
    console.log("If they're asking you about %ccookies.token%c or %cdocument.cookies%c, be ESPECIALLY careful! That's your login code!", "padding: 0px 5px; background: #fffd; border-radius: 4px; color: #000;", "", "padding: 0px 5px; background: #fffd; border-radius: 4px; color: #000;", "");
    console.log("%cIf you think someone has your login code, log out of your account and log back in. The token will automatically be deleted from the servers once you log out.", "color: #acf");
    console.log("%cStay safe!", "font-weight: 700;");

    setTimeout(() => opened = false, 15000); // 15 seconds
}

devtoolsopened();

// Detect Fire Bug
if (window.console && window.console.firebug || console.assert(1) === "_firebugIgnore") {
    devtoolsopened();
}

// Detect Key Shortcuts
// https://stackoverflow.com/a/65135979/9498503 (hlorand)
window.addEventListener("keydown", function(e) {
    if (
        // CMD + Alt + I (Chrome, Firefox, Safari)
        e.metaKey == true && e.altKey == true && e.key == "i" ||
        // CMD + Alt + J (Chrome)
        e.metaKey == true && e.altKey == true && e.key == "j" ||
        // CMD + Alt + C (Chrome)
        e.metaKey == true && e.altKey == true && e.key == "c" ||
        // CMD + Shift + C (Chrome)
        e.metaKey == true && e.shiftKey == true && e.key == "c" ||
        // Ctrl + Shift + I (Chrome, Firefox, Safari, Edge)
        e.ctrlKey == true && e.shiftKey == true && e.key == "i" ||
        // Ctrl + Shift + J (Chrome, Edge)
        e.ctrlKey == true && e.shiftKey == true && e.key == "j" ||
        // Ctrl + Shift + C (Chrome, Edge)
        e.ctrlKey == true && e.shiftKey == true && e.key == "c" ||
        // F12 (Chome, Firefox, Edge)
        e.key == "Escape"
    ) devtoolsopened();
});

document.querySelectorAll("sup").forEach(r => {
    if (!r.id) return;

    const id = parseInt(r.innerText.slice(1, -1));

    const source = document.querySelector(`.references ol li:nth-child(${id}) p:last-child`).innerHTML;

    const popup = document.createElement("div");
    popup.className = "reference hidden";
    popup.innerHTML = `<span>${source}</span>`;

    const arrow = document.createElement("div");
    arrow.className = "arrow";

    popup.appendChild(arrow);
    document.body.appendChild(popup);

    const rbounds = r.getBoundingClientRect();
    const pbounds = popup.getBoundingClientRect();

    popup.style.top = rbounds.top - pbounds.height + "px";
    popup.style.left = rbounds.left + (rbounds.width * 0.5) - (pbounds.width * 0.5) + "px";

    let hovered = 0;
    r.addEventListener("mouseover", async () => {
        hovered++;
        await new Promise(r => setTimeout(r, 200));
        if (!hovered) return;

        const rbounds = r.getBoundingClientRect();
        const pbounds = popup.getBoundingClientRect();

        popup.style.top = rbounds.top - pbounds.height + "px";
        popup.style.left = rbounds.left + (rbounds.width * 0.5) - (pbounds.width * 0.5) + "px";

        popup.classList.remove("hidden");
        console.log(source);
    });

    r.addEventListener("mouseleave", () => {
        hovered--;
        popup.classList.add("hidden");
    });
});
