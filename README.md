#  ASCII Streamer

[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2.1-blue.svg)](https://expressjs.com/)

Transform your images and videos into stunning ASCII art with customizable styles, colors, and real-time streaming. Upload your media, tweak the settings, and watch it convert to retro ASCII magic!

<div align="center">
  <strong>Convert Images & Videos → ASCII Art</strong><br>
  <em>Live streaming • Multiple styles • Color & Mono modes • Responsive design</em>
</div>

---

##  Table of Contents

- [ Features](#-features)
- [ Quick Start](#-quick-start)
- [ Prerequisites](#-prerequisites)
- [ Installation](#-installation)
- [ Usage](#-usage)
- [ Configuration](#️-configuration)
- [ How It Works](#-how-it-works)
- [ Project Structure](#-project-structure)
- [ Troubleshooting](#-troubleshooting)
- [ License](#-license)

---

##  Features

 **Image to ASCII**
- Upload any image and instantly convert to ASCII art
- Support for all common image formats (JPEG, PNG, GIF, WebP, etc.)

 **Video to ASCII**
- Stream live ASCII art conversion of video files
- Real-time frame processing with customizable frame rates
- Support for MP4, WebM, AVI, MOV, and other video formats

 **Multiple ASCII Styles**
- **Standard**: `@%#*+=-:. ` - Classic ASCII art
- **Inverted**: ` .:-=+*#%@` - Reversed brightness mapping
- **Blocks**: `@WMBRXVYXx+~-=:. ` - More detailed characters
- **Simple**: `█▓▒░ ` - Block characters for bold effect

 **Output Modes**
- **Mono**: Clean black and white ASCII art
- **Color**: Colored ASCII characters matching original colors
- **Hash Only**: Display only `#` characters in color mode for unique effect

 **Customizable Parameters**
- **Scale**: Control ASCII resolution (1-200 pixels per character)
- **Frame Rate**: Set video playback speed (1-60 FPS)
- **Style**: Choose from 4 different ASCII character sets

 **Theme Support**
- Toggle between dark and light themes
- Responsive design that works on desktop, tablet, and mobile

---

##  Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Tschakala/Ascii-Streamer-Website.git
cd ascii-stream2

# 2. Install dependencies
npm install

# 3. Make sure FFmpeg is installed (see Prerequisites)

# 4. Start the server
node server.js

# 5. Open browser and visit http://localhost:3000
```

That's it!  Upload a file and start creating ASCII art.

---

##  Prerequisites

Before running this application, ensure you have the following installed:

### Node.js
- **Version**: v14 or higher
- **Download**: https://nodejs.org/

### FFmpeg & FFprobe
Required for video processing and dimension detection.

**Windows:**
```bash
# Option 1: Download from ffmpeg.org
https://ffmpeg.org/download.html

# Option 2: Using Chocolatey (if installed)
choco install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install ffmpeg
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
ffprobe -version
```

---

##  Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Tschakala/Ascii-Streamer-Website.git
   cd ascii-stream2
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Ensure FFmpeg is in your PATH:**
   ```bash
   # Test by running:
   ffmpeg -version
   ```

---

##  Usage

### Running the Server

```bash
node server.js
```

You should see:
```
Server läuft auf http://localhost:3000
```

### Converting Images

1. Open http://localhost:3000 in your browser
2. Click **"Datei auswählen"** and select an image
3. Select **"Bild"** (Image) as input type
4. Choose your preferred settings:
   - **ASCII-Stil** (Style): Standard, Inverted, Blocks, or Simple
   - **Ausgabe-Modus** (Output): Mono or Color
   - **Skalierung** (Scale): 1-200 (lower = higher detail, larger output)
5. Click **"ASCII erzeugen"** to generate
6. View the ASCII art result and optionally go back to adjust settings

### Converting Videos

1. Open http://localhost:3000 in your browser
2. Click **"Datei auswählen"** and select a video file
3. Select **"Video"** as input type
4. Configure settings:
   - **ASCII-Stil** (Style): Choose your style
   - **Ausgabe-Modus** (Output): Mono or Color
   - **Skalierung** (Scale): 1-200
   - **Frame-Rate** (FPS): 1-60 (lower = smoother rendering, lower CPU)
5. Click **"ASCII erzeugen"** to start streaming
6. ASCII video will start playing immediately

### Tips for Best Results

- **Scale 1-4**: High detail, large terminal output, slower rendering
- **Scale 8-16**: Good balance, recommended for most users
- **Scale 20+**: Low detail, compact output, fast rendering
- **Video FPS**: Lower FPS (1-3) for better readability, higher FPS (5-10) for smooth motion
- **Color mode**: CPU intensive, disable if experiencing lag

---

##  Configuration

Server configuration is defined in `server.js`. You can modify:

### Port
```javascript
app.listen(3000, () => {
    console.log("Server läuft auf http://localhost:3000");
});
```
Change `3000` to your desired port.

### Upload Directory
```javascript
const filePath = path.join(__dirname, "uploads", filename);
```

### ASCII Styles
```javascript
const asciiStyles = {
    standard: "@%#*+=-:. ",
    inverted: " .:-=+*#%@",
    blocks: "@WMBRXVYXx+~-=:. ",
    simple: "█▓▒░ "
};
```
Add or modify styles as needed.

### FFmpeg Parameters
Adjust video processing settings in the `/stream-video/:filename` endpoint.

---

##  How It Works

### Image Processing Pipeline

```
1. Upload Image
   ↓
2. Parse & Rotate (using Sharp)
   ↓
3. Convert to Raw RGBA Pixel Data
   ↓
4. Group Pixels by Scale
   ↓
5. Calculate Average Brightness
   ↓
6. Map Brightness → ASCII Character
   ↓
7. Apply Colors (if enabled)
   ↓
8. Display ASCII Art
```

**Details:**
- Image is parsed using the `sharp` library for efficient processing
- Image is automatically rotated based on EXIF data
- Pixels are grouped according to the scale parameter
- Average brightness of each pixel group is calculated using weighted RGB values
- Brightness value (0-1) is mapped to ASCII character ramp
- If color mode is enabled, average RGB color is applied to each character

### Video Processing Pipeline

```
1. Upload Video
   ↓
2. Save to Uploads Directory
   ↓
3. Spawn FFmpeg Process
   ↓
4. Decode Frames (raw RGB24)
   ↓
5. Convert Frame → ASCII
   ↓
6. Stream via Server-Sent Events (SSE)
   ↓
7. Client Renders in Real-time
```

**Details:**
- Video file is saved to the uploads directory
- FFmpeg is spawned as a child process to decode video frames
- Video is scaled to ASCII resolution and decoded to raw RGB24 format
- Each frame is converted to ASCII using same algorithm as images
- ASCII data is sent to client using Server-Sent Events for streaming
- Client processes and renders frames sequentially
- Process is gracefully terminated when client disconnects

---

##  Project Structure

```
ascii-stream2/
├── server.js                    # Express server & ASCII conversion logic
├── package.json                 # Dependencies (Express, Multer, Sharp)
├── package-lock.json            # Locked dependency versions
├── README.md                     # This file
├── public/
│   ├── index.html              # Main upload form UI
│   ├── style.css               # Styling & responsive design
│   ├── theme-toggle.js         # Dark/light theme toggle
│   └── video-ascii.js          # Client-side video streaming handler
├── uploads/                     # Temporary video storage
└── .git/                        # Git repository
```

---

##  Troubleshooting

### FFmpeg Not Found
**Error:** `Failed to run ffmpeg: ...`

**Solution:**
1. Verify FFmpeg is installed: `ffmpeg -version`
2. Add FFmpeg to your system PATH
3. On Windows, restart your terminal after installing FFmpeg
4. Restart the Node.js server

### "Video dimensions could not be determined"
**Causes:** Corrupted video file, unsupported format, or FFprobe issue

**Solutions:**
1. Verify the video file is not corrupted
2. Try a different video format (MP4 is most compatible)
3. Ensure FFprobe is installed with FFmpeg
4. Check file permissions

### Server Won't Start
**Error:** `listen EADDRINUSE: address already in use :::3000`

**Solution:**
1. Change the port in `server.js` to an available port (e.g., 3001)
2. Or kill the process using port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   ```

### Slow Video Processing
**Causes:** Large video file, high FPS, low scale value (high detail)

**Solutions:**
1. Lower the FPS setting (3-5 is usually sufficient)
2. Increase the scale value (8-16 for faster processing)
3. Disable color mode
4. Try a smaller video file

### Out of Memory on Large Videos
**Causes:** Processing very long or high-resolution videos

**Solutions:**
1. Increase FFmpeg FPS for streaming (fewer frames buffered)
2. Reduce video resolution before uploading
3. Increase system available memory
4. Try shorter videos for testing

### Videos Not Playing in Browser
**Causes:** Browser SSE limitations, network issues, or large buffers

**Solutions:**
1. Refresh the page
2. Use a modern browser (Chrome, Firefox, Safari, Edge)
3. Check browser console for errors (F12)
4. Try a different, smaller video

### File Upload Rejected
**Error:** "Nur Bild- und Videodateien sind erlaubt." (Only image and video files allowed)

**Solution:**
- Ensure file has proper MIME type
- Try a different file format
- On Windows, rename file if it lacks proper extension

---

##  Performance Tips

- **Images**: Scale 8-16 for best quality/speed balance
- **Videos**: FPS 3-5 recommended, disable color for faster processing
- **Large files**: Process on a powerful system with adequate RAM
- **Network**: Run locally for best performance (no network latency)

---

##  License

ISC License - See LICENSE file for details

---

##  Author

**Tschakala**
- GitHub: [@Tschakala](https://github.com/Tschakala)

---

<div align="center">
  <strong>Made with ❤️ in Austria</strong><br>
  <sub>Transform your images and videos into beautiful ASCII art</sub>
</div>

---

**Note:** This application interface is in German. Text labels and error messages use German language.
