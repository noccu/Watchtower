import { CONFIG_DEFAULT } from "./constants.js"

/** @type {Config} */
export var CONFIG
// We need/like this for the autosave, which can trigger a lot.
var CONFIG_CHANGED = false

export async function loadConfig() {
    if (!CONFIG) {
        CONFIG = await chrome.storage.local.get(CONFIG_DEFAULT)
        console.debug("Config loaded:", CONFIG)
    }
    return CONFIG
}

export function saveConfig() {
    if (!CONFIG_CHANGED) return
    console.log("Saving config")
    // Let's just assume this always works :)
    chrome.storage.local.set(CONFIG)
    CONFIG_CHANGED = false
    console.log("Config saved")
}

//todo: Hmm. Are events any better? Custom classes? List functions?
export function markConfigChanged() {
    CONFIG_CHANGED = true
}
