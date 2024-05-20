export var DBG = true
// Map supported platforms to main key
/** @type {PlatformKeyed<string>} */
export const PLATFORMS = {
    "twitter": "rest_id",
    "misskey": "id"
}

export const reportTargets = [
    "https://twitter.com/*",
    "https://x.com/*",
    "https://misskey.io/*"
]

// The extension's default options
/** @type {Config} */
export const CONFIG_DEFAULT = {
    settings: {
        lastUpdate: 0,
        updateInterval: 6.048e8
    },
    lists: []
}

/** @type {LocalListData["exportOptions"]} */
export const DEFAULT_LIST_EXPORT_OPTIONS = {
    includeReports: false
}
