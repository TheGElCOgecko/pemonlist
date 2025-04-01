const snowLayer = document.createElement("div");
snowLayer.className = "snow";

if (!cookies.snow) cookies.set("snow", true);

// function getMetrics() {
//     const start = Date.now()
//     let i = 0, j = 0
//     let sum = 0;
//     for (i = 0; i < 9999; i++)
//         for (j = 0; j < 9999; j++)
//                 sum += i + j
//     return Date.now() - start
// }

// function averageMetrics(count = 5) {
//     let array = []
//     // Array.fill() only uses the one calculated value
//     for (let i = 0; i < count; i++) array.push(getMetrics())
//     return array.reduce((p, c) => p + c, 0) / count
// }

// let allowedParticles = 300

// window.addEventListener('load', () => {
//     const metric = getMetrics()
//     allowedParticles = 1277.86191 * Math.pow(0.993819, metric)

//     alert(`Allowed particles: ${allowedParticles}\nTTC: ${metric}`)
// })

class Snow {
    // sine offset
    offset = Math.random();

    // starting position
    x;
    y;

    // starting motion vector
    vecx;
    vecy;

    // index in the array
    index;

    element = document.createElement("div");

    constructor(x, y, vecx, vecy, index) {
        this.x = x;
        this.y = y;
        this.vecx = vecx;
        this.vecy = vecy;
        this.index = index;

        this.element.style.setProperty("--scale", Math.random() * 0.3 + 0.7);

        snowLayer.appendChild(this.element);
    }

    tickSnow(t) {
        const { element } = this;
        const { offset } = this;

        this.x += this.vecx;
        this.y -= this.vecy;

        element.style.setProperty("--x", this.x + (Math.sin(t * 0.0004 + (offset * 3)) * ((offset * 20) + 20))); // sinusoidal waving effect
        element.style.setProperty("--y", this.y);
    }

    resetSnow() {
        if (noMoreSnow) return this.deleteSnow();

        const vec = getRandomDownwardsVector();

        this.x = Math.random() * (window.innerWidth - 100) + 50;
        this.y = distribution(Math.random()) * -400 - 20;
        this.vecx = vec[0];
        this.vecy = vec[1];
    }

    deleteSnow() {
        this.element.remove();
        snow[this.index] = false;
    }
}

let snow = [];

const getRandomDownwardsVector = () => {
    const angle = (5 * Math.PI / 4) + (Math.random() * (3 * Math.PI / 8));
    return [ Math.cos(angle), Math.sin(angle) ];
};

function distribution(x) {
    return Math.max(0, Math.min(-Math.pow(1 - x, 4) + 1, 1));
}

// snow gets cut off the moment December ends
let noMoreSnow = false;

function startSnow() {
    // 400 - current amount of snow in the array (doesn't include empty values)
    noMoreSnow = false;
    for (let i = 0; i < 400 - snow.reduce((a, c) => c ? ++a : a, 0); i++) {
        const vec = getRandomDownwardsVector();
        snow.push(new Snow((Math.random() * (window.innerWidth - 100)) + 50, distribution(Math.random()) * -window.innerHeight * 2 - 20, vec[0], vec[1], snow.length));
    }

    cleanup();
}

// cleanup blank snow every so often
function cleanup() {
    let i = 0;
    snow = snow.reduce((a, c) => {
        if (c !== false) {
            c.index = i++;
            a.push(c);
        }
        return a;
    }, []);
}

setInterval(cleanup, 10000); // 10s

const snowTicker = () => {
    const now = Date.now();

    if (snow.every(v => v == false)) snow.length = 0;

    snow.forEach(snow => {
        if (!snow) return;

        snow.tickSnow(now);

        // max snow width is 20 and sin offsets it by around 20, set to make sure it doesn't snap out of existence
        if (snow.x < -40) snow.resetSnow();
        if (snow.x > window.innerWidth) snow.resetSnow();
        if (snow.y > window.innerHeight) snow.resetSnow();
    });

    setTimeout(snowTicker, 1000 / 25); // 25TPS
};

function stopSnow() {
    noMoreSnow = true;
    snow.forEach(snow => {
        if (snow.y < -20) snow.deleteSnow();
    });

    cleanup();
}

// doesn't start the snow if the user has it disabled, or it's no longer a winter month (Dec)
if (new Date().getMonth() == 11) {
    if (cookies.snow) startSnow();
    snowTicker();

    const untilJan = new Date(new Date().getFullYear() + 1, 0, 1).getTime() - Date.now();
    setTimeout(stopSnow, untilJan);
    document.body.appendChild(snowLayer);
}
