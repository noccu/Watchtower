export var DBG = true
// Map supported platforms to main key
/** @type {PlatformKeyed<string>} */
export const PLATFORMS = {
    "twitter": "rest_id",
    "pixiv": "id"
}

export const reportTargets = [
    "https://twitter.com/*"
]

// The extension's default options
/** @type {Config} */
export const CONFIG_DEFAULT = {
    settings: {},
    lists: []
}
