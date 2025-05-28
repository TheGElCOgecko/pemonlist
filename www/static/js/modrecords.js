const records = document.querySelectorAll(".record");

document.querySelectorAll(".stats button").forEach(e => e.addEventListener("click", () => {
    if (e.disabled) return;
    const params = new URLSearchParams(location.search);
    params.set("page", e.getAttribute("page"));
    location.search = params.toString();
}));

records.forEach(r => {
    const selectable = !!r.querySelector(".video .select");
    const iframe = r.querySelector(".video .preview iframe");
    const img = r.querySelector(".video .preview img");
    const link = r.querySelector(".video .preview a");
    const video = r.querySelector(".video .select :first-child");
    const raw = r.querySelector(".video .select :last-child");

    if (link && link.href.startsWith("https://") && link.href != location.href /* and empty href defaults to the location */) return; // raw video only

    img.addEventListener("click", e => {
        iframe.src = `https://www.youtube-nocookie.com/embed/${getVideoIDFromURL(e.target.src)}?autoplay=1`;
        e.target.style.display = "none";
        iframe.style.display = "";
    });
(function () {
        if (!selectable) return;

        const videourl = video.attributes["data-url"].value;
        const rawid = getVideoIDFromURL(raw.attributes["data-url"].value);
        const rawurl = rawid ?
            `https://www.youtube-nocookie.com/embed/${rawid}/?enablejsapi` :
            raw.attributes["data-url"].value;
        const imgurl = `https://i1.ytimg.com/vi/${getVideoIDFromURL(videourl)}/hqdefault.jpg`;
        const rawimg = rawid ?
            `https://i1.ytimg.com/vi/${rawid}/hqdefault.jpg` :
            null;

        link.style.display = "none";
        iframe.style.display = "none";

        iframe.src = "";

        video.addEventListener("click", e => {
            if (e.target.className == "selected") return;

            video.className = "selected";
            raw.className = "";

            if (iframe.style.display == "") {
                iframe.style.display = "";
                link.style.display = "none";
                img.style.display = "none";

                iframe.src = videourl;

                return;
            }

            iframe.style.display = "none";
            link.style.display = "none";
            img.style.display = "";

            iframe.src = "";
            img.src = imgurl;
            link.href = "";
        });

        raw.addEventListener("click", e => {
            if (e.target.className == "selected") return;

            video.className = "";
            raw.className = "selected";

            if (rawid) {
                if (iframe.style.display == "") {
                    iframe.style.display = "";
                    link.style.display = "none";
                    img.style.display = "none";

                    iframe.src = rawurl;

                    return;
                }

                iframe.style.display = "none";
                link.style.display = "none";
                img.style.display = "";

                iframe.src = "";
                img.src = rawimg;

                return;
            }

            iframe.style.display = "none";
            link.style.display = "";
            img.style.display = "none";

            iframe.src = "";
            link.href = e.target.dataset.url;
        });
    })();
});

document.querySelectorAll(".record select").forEach(s =>
    s.addEventListener("change", e => {
        const submit = s.parentElement.parentElement.querySelector('.submit input[type="submit"]');
        submit.disabled = true;

        if (s.value != s.querySelector('option[selected=""]').value) return submit.disabled = false;

        const sibling = s.parentElement.nextElementSibling ?? s.parentElement.previousElementSibling;
        const other = sibling.querySelector("select");

        if (other.value != other.querySelector('option[selected=""]').value) return submit.disabled = false;
    })
);

document.querySelectorAll(".submit select").forEach(s => s.addEventListener("change", e => {
    const submit = e.target.parentElement.lastElementChild;
    const denied = e.target.value == "denied";
    const investigating = e.target.value == "investigating";
    const reason = submit.previousElementSibling;

    reason.type = (denied || investigating) ? "text" : "hidden";
}));

let scrollTimeout = false;

document.body.addEventListener("scroll", () => {
    if (scrollTimeout) return;

    records.forEach(r => {
        const iframe = r.firstElementChild.lastElementChild.lastElementChild.querySelector("iframe");
        if (!iframe || iframe.style.display == "none") return;

        const rect = iframe.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < innerHeight) return;

        iframe.style.display = "none";
        iframe.nextElementSibling.style.display = "";
        iframe.src = "";
    }, { passive: true });

    scrollTimeout = true;
    setTimeout(() => scrollTimeout = false, 200);
}, { passive: true });
