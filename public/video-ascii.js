const asciiStyles = {
    standard: "@%#*+=-:. ",
    inverted: " .:-=+*#%@",
    blocks: "@WMBRXVYXx+~-=:. ",
    simple: "█▓▒░ "
};

function pixelBrightness([r, g, b, a]) {
    const alphaFactor = a / 255;
    return ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) * alphaFactor;
}

function buildAscii(pixelRows, style, scale, colorMode = false, hashOnly = false) {
    const ramp = asciiStyles[style] || asciiStyles.standard;
    const maxIndex = ramp.length - 1;
    const height = pixelRows.length;
    const width = height > 0 ? pixelRows[0].length : 0;
    const yStep = Math.max(1, Math.round(scale * 1.3));
    let ascii = "";

    for (let y = 0; y < height; y += yStep) {
        let line = "";
        for (let x = 0; x < width; x += scale) {
            let sum = 0;
            let count = 0;
            let rSum = 0;
            let gSum = 0;
            let bSum = 0;
            let aSum = 0;

            for (let yy = y; yy < Math.min(height, y + yStep); yy++) {
                for (let xx = x; xx < Math.min(width, x + scale); xx++) {
                    const [r, g, b, a] = pixelRows[yy][xx];
                    sum += pixelBrightness([r, g, b, a]);
                    count++;
                    rSum += r;
                    gSum += g;
                    bSum += b;
                    aSum += a;
                }
            }

            const brightness = count ? sum / count : 0;
            const char = hashOnly ? "#" : ramp[Math.round(brightness * maxIndex)];

            if (colorMode) {
                const avgR = Math.round(rSum / count);
                const avgG = Math.round(gSum / count);
                const avgB = Math.round(bSum / count);
                line += `<span style="color: rgb(${avgR}, ${avgG}, ${avgB});">${char}</span>`;
            } else {
                line += char;
            }
        }
        ascii += line + "\n";
    }

    return ascii;
}

function readFramePixels(canvas) {
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const rows = [];
    for (let y = 0; y < canvas.height; y++) {
        const row = [];
        for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            row.push([pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]]);
        }
        rows.push(row);
    }
    return rows;
}

function computeFontSize(columns, rows) {
    return `clamp(0.6rem, min(calc((100vw - 88px) / (${columns} * 0.55)), calc((100vh - 180px) / (${rows} * 0.75))), 1.1rem)`;
}

function createServerAsciiPlayer({ streamUrl }) {
    const asciiContainer = document.createElement("div");
    asciiContainer.className = "ascii-animation";
    asciiContainer.style.width = "100%";
    asciiContainer.style.overflowX = "hidden";

    const status = document.createElement("div");
    status.className = "ascii-status";
    status.textContent = "Verbinde...";
    status.style.marginBottom = "10px";
    asciiContainer.appendChild(status);

    const textArea = document.createElement("pre");
    textArea.style.fontSize = "0.75rem";
    textArea.style.lineHeight = "0.8";
    textArea.style.margin = "0";
    textArea.style.display = "block";
    textArea.style.width = "100%";
    textArea.style.whiteSpace = "pre";
    textArea.style.overflowX = "hidden";
    asciiContainer.appendChild(textArea);

    let source = null;
    let paused = false;

    function openStream() {
        if (source) return;
        source = new EventSource(streamUrl);
        status.textContent = "Lädt...";

        source.onmessage = (event) => {
            if (paused) return;
            textArea.innerHTML = event.data;
            status.textContent = "Wiedergabe";
        };

        source.onerror = () => {
            status.textContent = "Verbindung unterbrochen...";
            source.close();
            source = null;
        };
    }

    function closeStream() {
        paused = true;
        if (source) {
            source.close();
            source = null;
        }
        status.textContent = "Pausiert";
    }

    function resumeStream() {
        if (!paused) return;
        paused = false;
        openStream();
    }

    const controls = document.createElement("div");
    controls.id = "animation-controls";
    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.textContent = "Play";
    const pauseButton = document.createElement("button");
    pauseButton.type = "button";
    pauseButton.textContent = "Pause";

    playButton.addEventListener("click", resumeStream);
    pauseButton.addEventListener("click", closeStream);

    controls.appendChild(playButton);
    controls.appendChild(pauseButton);
    asciiContainer.appendChild(controls);

    return {
        asciiContainer,
        play: openStream,
        pause: closeStream
    };
}

function initUploadUi() {
    const uploadTypeFields = document.querySelectorAll("input[name=\"uploadType\"]");
    const fpsField = document.getElementById("fps-field");
    const fileInput = document.getElementById("file");

    if (!uploadTypeFields.length || !fpsField || !fileInput) {
        return;
    }

    function updateUi() {
        const selectedType = document.querySelector("input[name=\"uploadType\"]:checked").value;
        fpsField.classList.toggle("hidden", selectedType !== "video");
        fileInput.accept = selectedType === "video" ? "video/*" : "image/*";
        const scaleInput = document.querySelector("#scale");
        if (scaleInput) {
            scaleInput.min = selectedType === "video" ? "1" : "1";
            scaleInput.max = selectedType === "video" ? "40" : "200";
        }
    }

    uploadTypeFields.forEach((radio) => radio.addEventListener("change", updateUi));
    updateUi();
}

function initVideoPage() {
    const config = window.asciiVideoConfig;
    const outputArea = document.getElementById("video-output");
    if (!config || !outputArea) return;

    const player = createServerAsciiPlayer(config);
    outputArea.innerHTML = "";
    outputArea.appendChild(player.asciiContainer);
    player.play();
}

window.addEventListener("DOMContentLoaded", () => {
    if (window.asciiVideoConfig) {
        initVideoPage();
    } else {
        initUploadUi();
    }
});
