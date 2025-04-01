const username = document.getElementById("username");
const img = document.querySelector(".profile img");
const code = document.querySelector('input[name="discord"]');
const cont = document.querySelector('input[type="submit"]');
const discord = document.querySelector(".discord");

// fill in the info from the setup page

const url = new URL(location);

document.getElementById("username").value = url.searchParams.get("username");

switch (url.searchParams.get("device")) {
    case "both":
        document.querySelector('#device option[value="both"]').selected = true;
    case "mobile":
        document.querySelector('#device option[value="mobile"]').selected = true;
    case "desktop":
        document.querySelector('#device option[value="desktop"]').selected = true;
    default:
        document.querySelector('#device option[value="mobile"]').selected = mobile;
}

const popupLogger = new Logger("Migrate", "Popup");

// I don't want to implement flash messages in rust so we're doing this
history.pushState({}, "", "/account/migrate");

let discordCode = "";

function openDiscordOauth() {
    const url = location.origin + "/oauth";
    const popup = window.open(
        `https://discord.com/oauth2/authorize?client_id=1229098588475232327&response_type=code&redirect_uri=${encodeURIComponent(url)}&scope=identify`,
        "",
        "popup,width=550,height=850"
    );

    const checkOauthWindow = setInterval(() => {
        if (popup.closed) {
            popupLogger.warn("User closed popup early!");
            return clearInterval(checkOauthWindow);
        }

        try { popup.window.location.host; }
        catch { return; }

        discordCode = new URLSearchParams(popup.window.location.search).get("code");
        if (!discordCode) return;

        code.value = discordCode;
        popupLogger.info("Retrieved Discord auth code successfully!");
        discord.classList.add("done");

        popup.close();
        clearInterval(checkOauthWindow);
    }, 500);
}

if (discord) {
    discord.addEventListener("click", openDiscordOauth);
    cont.addEventListener("click", e => code.value = discordCode);
}
