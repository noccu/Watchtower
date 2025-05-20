//todo: /explore accounts
const PLATFORM = "patreon"
const IGNORED_LOCATIONS = ["", "messages", "notifications", "settings"]

// Markers
const LABEL = document.createElement("span")
LABEL.className = "wt-label"
const LABEL_CONTAINER = document.createElement("div")
LABEL_CONTAINER.className = "wt-label-container"
const MESSAGE = document.createElement("div")
MESSAGE.className = "profile-msg"
const MESSAGE_CONTAINER = document.createElement("div")
MESSAGE_CONTAINER.id = "profile-msg-container"

const USER_MAP = {}


function getNamedPath(path) {
    const parts = path.split(/[\/?]/)
    return parts[1] == "checkout" ? parts[2] : parts[1]
}

async function parseLocation() {
    const loc = getNamedPath(location.pathname)
    if (IGNORED_LOCATIONS.includes(loc)) return
    else if (loc == "explore") {
        console.warn("Not implemented")
    }
    // Assume user page
    else {
        processProfile(loc)
    }
}

/** Process profile pages */
function processProfile(username) {
    const info = JSON.parse(document.head.querySelector("script[type='application/ld+json']").textContent)
    const userId = info.author.image.contentUrl.match(/campaign\/(\d+)\//)[1]
    /** @type {User} */
    const user = {
        id: userId,
        name: username
        // info.author.name is the displayname and not usable
    }
    // Looks like Patreon names are case-insensitive, but we'll keep the original URL's capitalization.
    // That's why it's not done in getNamedPath().
    USER_MAP[username.toLowerCase()] = user
    checkUser(user).then(data => markProfile(data))
}

/** @param {SerializedUser} user */
function markProfile(user) {
    // Clear existing mark just in case.
    document.getElementById(MESSAGE_CONTAINER.id)?.remove()
    if (!user) return // Not on a list
    let container = MESSAGE_CONTAINER.cloneNode()
    for (let list of user.onLists) {
        /** @type {HTMLDivElement} */
        let msgCopy = MESSAGE.cloneNode()
        msgCopy.textContent = `${list.meta.label}\n${list.meta.msg}`
        msgCopy.style.backgroundColor = list.meta.color
        container.append(msgCopy)
    }
    // Central user info, under the post count.
    document.querySelector("ul[class^=sc-]").after(container)
}

// Communication //

/**
 * @param {User} user
 * @returns {Promise<SerializedUser>} */
function checkUser(user) {
    console.debug("Checking user:", user)
    if (!user) return Promise.resolve()
    return chrome.runtime.sendMessage({
        action: "check-user",
        platform: PLATFORM,
        user
    })
}

// Reports
function msgResponder(msg, _sender, answer) {
    console.debug("Received:", msg)
    if (msg.action == "get-user") {
        let target = new URL(msg.targetLink)
        let username = getNamedPath(target.pathname)
        let user = USER_MAP[username.toLowerCase()]
        if (!user) {
            answer(undefined)
            return
        }
        answer({
            ...user,
            platform: PLATFORM
        })
    }
}

// Load //

function onLoad() {
    chrome.runtime.onMessage.addListener(msgResponder)
    window.addEventListener("DOMContentLoaded", parseLocation)
}

onLoad()
console.log(`${chrome.runtime.getManifest().name} loaded.`)
