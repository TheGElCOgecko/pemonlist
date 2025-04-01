const main = document.querySelector("main");
const levelLogger = new Logger("Level");
(async function() {
    const image = await fetch(`https://raw.githubusercontent.com/cdc-sys/level-thumbnails/main/thumbs/${location.pathname.match(/(\d+)/)[0]}.png`);

    if (image.status == 200) {
        levelLogger.log("BG URL valid");

        const loader = new Image();
        loader.src = image.url;
        await new Promise(resolve => loader.onload = resolve);

        levelLogger.log("Image loaded to cache");

        main.classList.add("transparent");
        main.style.background = `url('${image.url}')`;
    }
})();

const { body } = document;

function adjustParallax() {
    const offset = body.scrollTop * 0.3;
    main.style.backgroundPositionY = offset + "px";
}

body.addEventListener("scroll", adjustParallax, { passive: true });

adjustParallax();
