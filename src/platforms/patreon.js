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
var NEW_LAYOUT = false


/**@argument {URL|Location} path */
function getNamedPath(path) {
    const parts = path.pathname.split(/[\/?]/)
    const loc = ["checkout", "cw"].includes(parts[1]) ? parts[2] : parts[1]
    return { root: parts[1], loc }
}

async function parseLocation() {
    const { root, loc } = getNamedPath(location)
    if (root == "cw") NEW_LAYOUT = true
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
async function processProfile(username) {
    var userId, campaignId
    if (NEW_LAYOUT) {
        for (let a of document.body.querySelectorAll("script")) {
            if (!a.textContent.startsWith("self.__next_f.push([1")) continue
            a = a.textContent.replaceAll("\\", "")
            const m = a.match(/\$L27.+{"campaign":{"data":{"id":"(\d+)".+api\/user\/(\d+)/)
            if (!m) continue
            campaignId = m[1]
            userId = m[2]
            break
        }
    }
    else {
        const campaignInfo = JSON.parse(document.head.querySelector("script[type='application/ld+json']").textContent)
        campaignId = campaignInfo.mainEntity.image.contentUrl.match(/campaign\/(\d+)\//)[1]
        const userInfo = await fetch(`https://www.patreon.com/api/campaigns/${campaignId}`).then(d=>d.json())
        userId = userInfo.data.relationships.creator.data.id
    }
    /** @type {User} */
    const user = {
        id: userId,
        name: username,
        campaign_id: campaignId
        // info.author.name is the displayname and not usable
    }
    // Looks like Patreon names are case-insensitive, but we'll keep the original URL's capitalization.
    // That's why it's not done in getNamedPath().
    USER_MAP[username.toLowerCase()] = user
    checkUser(user).then(data => markProfile(data))
}

/** @param {SerializedUser} user */
async function markProfile(user) {
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
    if (NEW_LAYOUT) {
        await domExist("div[style^='--creator'] .sc-2c79702b-0.jrAvmO > button")
        document.querySelector("div[style^='--creator'] > .cm-boPIeQ").after(container)
    }
    else {
        document.querySelector("ul[class^=sc-]").after(container)
    }
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
        let username = getNamedPath(new URL(msg.targetLink)).loc
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
