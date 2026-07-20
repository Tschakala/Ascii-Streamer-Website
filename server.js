const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { spawn, execFile } = require("child_process");
const sharp = require("sharp");

const app = express();

app.use(express.static(__dirname + "/public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.urlencoded({ extended: true }));

app.get("/upload", (req, res) => {
    res.redirect("/");
});

app.get("/stream-video/:filename", async (req, res, next) => {
    try {
        const filename = path.basename(req.params.filename);
        const filePath = path.join(__dirname, "uploads", filename);
        await fs.access(filePath);

        const style = req.query.style || "standard";
        const scale = Math.max(1, Math.min(200, parseInt(req.query.scale, 10) || 8));
        const fps = Math.max(1, Math.min(60, parseInt(req.query.fps, 10) || 3));
        const colorMode = req.query.colorMode === "true";
        const hashOnly = req.query.hashOnly === "on" || req.query.hashOnly === "true";

        const { width: videoWidth, height: videoHeight } = await getVideoDimensions(filePath);
        const asciiWidth = Math.max(1, Math.floor(videoWidth / scale));
        const asciiHeight = Math.max(1, Math.floor(videoHeight / Math.max(1, Math.round(scale * 1.3))));
        const frameSize = asciiWidth * asciiHeight * 3;

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive"
        });
        res.write(": connected\n\n");

        const ffmpeg = spawn("ffmpeg", [
            "-hide_banner",
            "-loglevel",
            "error",
            "-stream_loop",
            "-1",
            "-i",
            filePath,
            "-vf",
            `fps=${fps},scale=${asciiWidth}:${asciiHeight}`,
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "pipe:1"
        ]);

        req.on("close", () => {
            ffmpeg.kill("SIGTERM");
        });

        let buffer = Buffer.alloc(0);
        ffmpeg.stdout.on("data", (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            while (buffer.length >= frameSize) {
                const frame = buffer.slice(0, frameSize);
                buffer = buffer.slice(frameSize);
                const ascii = buildAsciiFromRgb(frame, asciiWidth, asciiHeight, style, colorMode, hashOnly);
                sendSse(res, ascii);
            }
        });

        ffmpeg.stderr.on("data", (data) => {
            console.error("ffmpeg:", data.toString());
        });

        ffmpeg.on("error", (err) => {
            console.error(err);
            if (!res.headersSent) {
                res.status(500).send("ffmpeg wird benötigt, um Video-Frames zu rendern.");
            }
        });

        ffmpeg.on("exit", (code, signal) => {
            if (!res.writableEnded) {
                res.end();
            }
        });
    } catch (err) {
        next(err);
    }
});

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype && (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/"))) {
            cb(null, true);
        } else {
            cb(new Error("Nur Bild- und Videodateien sind erlaubt."), false);
        }
    }
});

const asciiStyles = {
    standard: "@%#*+=-:. ",
    inverted: " .:-=+*#%@",
    blocks: "@WMBRXVYXx+~-=:. ",
    simple: "█▓▒░ "
};

function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        execFile(command, args, (error, stdout, stderr) => {
            if (error) {
                const err = new Error(`Failed to run ${command}: ${stderr.toString().trim()}`);
                err.original = error;
                return reject(err);
            }
            resolve(stdout.toString());
        });
    });
}

async function getVideoDimensions(filePath) {
    const output = await runCommand("ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=p=0:s=x",
        filePath
    ]);
    const [width, height] = output.trim().split("x").map(Number);
    if (!width || !height) {
        throw new Error("Konnte Video-Dimensionen nicht bestimmen.");
    }
    return { width, height };
}

function buildAsciiFromRgb(rgbBuffer, width, height, style, colorMode = false, hashOnly = false) {
    const pixelRows = [];
    let offset = 0;
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            row.push([
                rgbBuffer[offset],
                rgbBuffer[offset + 1],
                rgbBuffer[offset + 2],
                255
            ]);
            offset += 3;
        }
        pixelRows.push(row);
    }
    return buildAscii(pixelRows, style, 1, colorMode, hashOnly);
}

function sendSse(res, data) {
    const lines = data.replace(/\r/g, "").split("\n");
    for (const line of lines) {
        res.write(`data: ${line}\n`);
    }
    res.write("\n");
}

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

app.post("/upload", upload.single("file"), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).send("Es wurde keine Datei hochgeladen.");
        }

        const isVideo = req.body.uploadType === "video" || req.file.mimetype.startsWith("video/");
        const style = req.body.style || "standard";
        const scale = Math.max(1, Math.min(200, parseInt(req.body.scale, 10) || 8));
        const fps = Math.max(1, Math.min(60, parseInt(req.body.fps, 10) || 3));
        const colorMode = req.body.outputMode === "color";
        const hashOnly = colorMode && req.body.hashOnly === "on";

        const params = new URLSearchParams();
        params.set("uploadType", isVideo ? "video" : "image");
        params.set("style", style);
        params.set("outputMode", req.body.outputMode || "mono");
        params.set("scale", String(scale));
        params.set("fps", String(fps));
        if (hashOnly) params.set("hashOnly", "on");
        const backHref = `/?${params.toString()}`;

        if (isVideo) {
            const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(req.file.originalname) || ".mp4"}`;
            const filePath = path.join(__dirname, "uploads", filename);
            await fs.writeFile(filePath, req.file.buffer);

            const streamUrl = `/stream-video/${encodeURIComponent(filename)}?style=${encodeURIComponent(style)}&outputMode=${encodeURIComponent(req.body.outputMode || "mono")}&scale=${scale}&fps=${fps}${hashOnly ? "&hashOnly=on" : ""}${colorMode ? "&colorMode=true" : ""}`;
            res.send(`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>ASCII Video</title><link rel="stylesheet" href="/style.css"><script>window.asciiVideoConfig = ${JSON.stringify({ streamUrl })};</script><script src="/theme-toggle.js" defer></script><script src="/video-ascii.js" defer></script></head><body><div class="page-shell"><main class="card wide-card"><div class="header"><h1>ASCII Video</h1></div><div id="video-output"></div><p><a class="btn secondary" href="${backHref}">Zurück</a></p></main></div></body></html>`);
            return;
        }

        const image = sharp(req.file.buffer).rotate().ensureAlpha();

        const { data, info } = await image
            .raw()
            .toBuffer({ resolveWithObject: true });

        let pixelRows = [];
        for (let y = 0; y < info.height; y++) {
            const row = [];
            for (let x = 0; x < info.width; x++) {
                const idx = (y * info.width + x) * info.channels;
                row.push([
                    data[idx],
                    data[idx + 1],
                    data[idx + 2],
                    data[idx + 3]
                ]);
            }
            pixelRows.push(row);
        }

        const columns = pixelRows[0] ? pixelRows[0].length : 0;
        const rows = pixelRows.length;
        const yStep = Math.max(1, Math.round(scale * 1.3));
        const asciiColumns = Math.max(1, Math.ceil(columns / scale));
        const asciiRows = Math.max(1, Math.ceil(rows / yStep));
        const ascii = buildAscii(pixelRows, style, scale, colorMode, hashOnly);
        req.file.buffer = null;
        pixelRows.length = 0;
        pixelRows = null;

        const fontSize = asciiColumns > 0 && asciiRows > 0
            ? `clamp(0.8rem, min(calc((100vw - 80px) / (${asciiColumns} * 0.55)), calc((100vh - 180px) / (${asciiRows} * 0.68))), 1.1rem)`
            : "0.95rem";
        const lineHeight = "0.7";

        res.send(`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>ASCII Art</title><link rel="stylesheet" href="/style.css"><script src="/theme-toggle.js" defer></script></head><body><div class="page-shell"><main class="card wide-card"><div class="header"><h1>ASCII Art (${style}${colorMode ? " - Color" : ""}${hashOnly ? " - Hash" : ""})</h1></div><div class="ascii-result"><pre style="font-size: ${fontSize}; line-height: ${lineHeight};">${ascii}</pre></div><p><a class="btn secondary" href="${backHref}">Zurück</a></p></main></div></body></html>`);
    } catch (err) {
        next(err);
    }
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(400).send(err.message || "Ein Fehler ist aufgetreten.");
});

app.listen(3000, () => {
    console.log("Server läuft auf http://localhost:3000");
});