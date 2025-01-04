import { CONFIG_DEFAULT } from "./constants.js"

/** @type {Config} */
var CONFIG

export async function loadConfig() {
    if (!CONFIG) {
        CONFIG = await chrome.storage.local.get(CONFIG_DEFAULT)
        console.debug("Config loaded:", CONFIG)
    }
    return CONFIG
}

/** @param {keyof Config} key */
export function saveConfig(key = undefined) {
    console.debug("Saving config")
    if (key) {
        chrome.storage.local.set({[key]: CONFIG[key]})
    }
    else {
        chrome.storage.local.set(CONFIG)
    }
    console.log("Config saved")
}

/** @param {keyof Config} key */
export function getConfig(key) {
    return CONFIG[key]
}

/** @param {keyof Settings} key */
export function changeSetting(key, value) {
    CONFIG.settings[key] = value
    saveConfig("settings")
}
