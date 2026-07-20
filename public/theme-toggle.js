const themeToggle = document.createElement("button");
themeToggle.type = "button";
themeToggle.className = "theme-toggle";

defaultTheme();

function defaultTheme() {
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = storedTheme || (prefersDark ? "dark" : "light");
    applyTheme(theme);
    themeToggle.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
}

function initThemeToggle() {
    themeToggle.addEventListener("click", () => {
        const nextTheme = document.documentElement.classList.contains("light-theme") ? "dark" : "light";
        applyTheme(nextTheme);
        localStorage.setItem("theme", nextTheme);
        themeToggle.textContent = nextTheme === "dark" ? "Light Mode" : "Dark Mode";
    });

    const header = document.querySelector(".header");
    if (header) {
        header.appendChild(themeToggle);
    }
    restoreFormValues();
    attachFormSaveHandlers();
    const form = document.querySelector("form");
    if (form) {
        form.addEventListener("submit", saveFormValues);
    }
}

function attachFormSaveHandlers() {
    const inputs = document.querySelectorAll("#style, input[name=\"outputMode\"], input[name=\"uploadType\"], input[name=\"hashOnly\"], #scale, #fps");
    inputs.forEach((input) => {
        input.addEventListener("change", saveFormValues);
        input.addEventListener("input", saveFormValues);
    });
    window.addEventListener("beforeunload", saveFormValues);
}

function applyTheme(theme) {
    if (theme === "light") {
        document.documentElement.classList.add("light-theme");
    } else {
        document.documentElement.classList.remove("light-theme");
    }
}

function getStoredFormValues() {
    try {
        return JSON.parse(localStorage.getItem("asciiFormValues") || "{}");
    } catch {
        return {};
    }
}

function saveFormValues() {
    const uploadTypeInput = document.querySelector("input[name=\"uploadType\"]:checked");
    const styleInput = document.querySelector("#style");
    const outputModeInput = document.querySelector("input[name=\"outputMode\"]:checked");
    const hashCheckbox = document.querySelector("input[name=\"hashOnly\"]");
    const scaleInput = document.querySelector("#scale");
    const fpsInput = document.querySelector("#fps");

    const values = {
        uploadType: uploadTypeInput?.value || "image",
        style: styleInput?.value || "standard",
        outputMode: outputModeInput?.value || "mono",
        hashOnly: hashCheckbox?.checked ? "on" : "off",
        scale: scaleInput?.value || "8",
        fps: fpsInput?.value || "3"
    };

    localStorage.setItem("asciiFormValues", JSON.stringify(values));
}

function restoreFormValues() {
    const params = new URLSearchParams(window.location.search);
    const stored = getStoredFormValues();

    const styleValue = params.get("style") || stored.style;
    const outputModeValue = params.get("outputMode") || stored.outputMode;
    const hashOnlyValue = params.get("hashOnly") || stored.hashOnly || "off";
    const uploadTypeValue = params.get("uploadType") || stored.uploadType;
    const scaleValue = params.get("scale") || stored.scale;
    const fpsValue = params.get("fps") || stored.fps;

    if (styleValue) {
        const styleOption = document.querySelector(`#style option[value="${styleValue}"]`);
        if (styleOption) styleOption.selected = true;
    }

    if (outputModeValue) {
        const outputRadio = document.querySelector(`input[name="outputMode"][value="${outputModeValue}"]`);
        if (outputRadio) outputRadio.checked = true;
    }

    if (hashOnlyValue !== null) {
        const hashCheckbox = document.querySelector("input[name=\"hashOnly\"]");
        if (hashCheckbox) hashCheckbox.checked = hashOnlyValue === "on" || hashOnlyValue === true;
    }

    if (uploadTypeValue) {
        const typeRadio = document.querySelector(`input[name="uploadType"][value="${uploadTypeValue}"]`);
        if (typeRadio) typeRadio.checked = true;
    }

    if (scaleValue) {
        const scaleInput = document.querySelector("#scale");
        if (scaleInput) scaleInput.value = scaleValue;
    }

    if (fpsValue) {
        const fpsInput = document.querySelector("#fps");
        if (fpsInput) fpsInput.value = fpsValue;
    }

    const inputs = document.querySelectorAll("#style, input[name=\"outputMode\"], input[name=\"uploadType\"], input[name=\"hashOnly\"], #scale, #fps");
    inputs.forEach((input) => {
        input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    saveFormValues();
}

window.addEventListener("DOMContentLoaded", initThemeToggle);
