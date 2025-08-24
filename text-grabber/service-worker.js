// Background service worker: context menu + keyboard command

const CONTEXT_MENU_ID = "grab-selection";

function isScriptableUrl(url) {
if (!url) return false;
try {
const u = new URL(url);
const blockedSchemes = new Set(["chrome:", "edge:", "brave:", "about:", "devtools:", "view-source:", "chrome-extension:"]);
if (blockedSchemes.has(u.protocol)) return false;
const blockedHosts = new Set(["chrome.google.com", "chromewebstore.google.com"]);
if (blockedHosts.has(u.hostname)) return false;
return true;
} catch (e) {
return false;
}
}

chrome.runtime.onInstalled.addListener(() => {
try {
chrome.contextMenus.create({
id: CONTEXT_MENU_ID,
title: "Grab selected text",
contexts: ["selection"]
});
} catch (e) {
// Ignore duplicate creation errors on reload
}
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
try {
if (info.menuItemId === CONTEXT_MENU_ID && tab?.id) {
await executeGrab(tab.id);
}
} catch (e) {
// Avoid logging in production
}
});

chrome.commands.onCommand.addListener(async (command) => {
if (command === "grab-text") {
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (tab?.id) await executeGrab(tab.id);
}
});

async function executeGrab(tabId) {
try {
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (!isScriptableUrl(tab?.url)) {
await chrome.storage.local.set({ lastGrab: "" });
return;
}
const [{ result } = {}] = await chrome.scripting.executeScript({
target: { tabId },
func: () => {
const sel = window.getSelection?.().toString() || "";
const text = sel.trim() ? sel : document.body.innerText || "";
return text.trim();
}
});

await chrome.storage.local.set({ lastGrab: result || "" });
} catch (e) {
await chrome.storage.local.set({ lastGrab: "" });
}
}

// Allow popup to request a fresh grab
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
if (msg?.type === "GRAB_ACTIVE_TAB") {
(async () => {
try {
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (!tab?.id) return sendResponse({ ok: false, error: "No active tab" });
if (!isScriptableUrl(tab.url)) return sendResponse({ ok: false, error: "This page can't be scripted" });

const [{ result } = {}] = await chrome.scripting.executeScript({
target: { tabId: tab.id },
func: () => {
const sel = window.getSelection?.().toString() || "";
const text = sel.trim() ? sel : document.body.innerText || "";
return text.trim();
}
});

await chrome.storage.local.set({ lastGrab: result || "" });
sendResponse({ ok: true, text: result || "" });
} catch (e) {
sendResponse({ ok: false, error: "Grab failed" });
}
})();
return true; // keep the message channel open for async response
}
});