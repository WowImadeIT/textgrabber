const output = document.getElementById("output");
const chars = document.getElementById("chars");
const words = document.getElementById("words");


function updateStats(text) {
chars.textContent = `${text.length} chars`;
const w = text.trim() ? text.trim().split(/\s+/).length : 0;
words.textContent = `${w} words`;
}


async function loadFromStorage() {
const { lastGrab = "" } = await chrome.storage.local.get("lastGrab");
output.value = lastGrab;
updateStats(lastGrab);
}


async function grabNow() {
try {
const res = await chrome.runtime.sendMessage({ type: "GRAB_ACTIVE_TAB" });
if (res?.ok) {
output.value = res.text || "";
updateStats(res.text || "");
} else if (res?.error) {
flash(res.error);
}
} catch (e) {
// Likely due to restricted pages (e.g., chrome://) or missing tab
flash("Can't grab on this page");
}
}


document.getElementById("refresh").addEventListener("click", async () => {
if (output.value.trim()) {
output.value = "";
updateStats("");
try { await chrome.storage.local.set({ lastGrab: "" }); } catch {}
flash("Cleared");
} else {
await grabNow();
}
});


document.getElementById("copy").addEventListener("click", async () => {
try {
await navigator.clipboard.writeText(output.value);
flash("Copied");
} catch (e) {
flash("Copy failed");
}
});


document.getElementById("download").addEventListener("click", () => {
const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `grab-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
a.click();
URL.revokeObjectURL(url);
});


// (Send button removed)

// Open options page
document.getElementById("options").addEventListener("click", (e) => {
e.preventDefault();
if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
});

// Simple flash helper
function flash(message) {
const el = document.createElement("div");
el.textContent = message;
el.style.position = "fixed";
el.style.bottom = "12px";
el.style.left = "50%";
el.style.transform = "translateX(-50%)";
el.style.background = "#111";
el.style.color = "#fff";
el.style.padding = "6px 10px";
el.style.borderRadius = "6px";
el.style.fontSize = "12px";
el.style.opacity = "0";
el.style.transition = "opacity 120ms ease";
document.body.appendChild(el);
requestAnimationFrame(() => {
el.style.opacity = "1";
});
setTimeout(() => {
el.style.opacity = "0";
setTimeout(() => el.remove(), 200);
}, 1400);
}

// Initialise: show last grab immediately, then attempt fresh grab
(async () => {
await loadFromStorage();
await grabNow();
})();
