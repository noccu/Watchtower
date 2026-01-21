const PLATFORM = "subscribestar"

// Markers
const MESSAGE = document.createElement("div")
MESSAGE.className = "profile-msg"
const MESSAGE_CONTAINER = document.createElement("div")
MESSAGE_CONTAINER.id = "profile-msg-container"

const USER_MAP = {}


/**@argument {URL|Location} path */
function getNamedPath(path) {
    return path.pathname.split(/[\/?]/)[1]
}

async function parseLocation() {
    const user_name_ele = document.querySelector("div.profile_main_info-name")
    if (!user_name_ele) return
    processProfile(user_name_ele.textContent)
}

/** Process profile pages */
async function processProfile(dislayname) {
    // Names are case-insensitive.
    const username = getNamedPath(location)
    /** @type {User} */
    const user = {
        id: document.querySelector("div.profile_main_info img[data-user-id]").dataset.userId,
        name: username
    }
    if (dislayname.toLowerCase() != username) {
        user.dislayname = dislayname
    }
    USER_MAP[username] = user
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
    document.querySelector("div.profile_main_info-name").after(container)
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
    // We can't match outside of the current page,
    // so only use that regardless of link target.
    // TODO: Consider API usage, if supported.
    console.debug("Received:", msg)
    if (msg.action == "get-user") {
        let username = getNamedPath(location)
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
    parseLocation()
    const observer = new MutationObserver(changes => {
        // if (changes[0].removedNodes[0]?.id != "nprogress") return
        if (changes[0].target.classList.contains("is-loading")) return
        parseLocation()
    })
    observer.observe(document.querySelector("#root"), {
        attributes: true,
        attributeFilter: ["class"]
    })
}

chrome.runtime.onMessage.addListener(msgResponder)
window.addEventListener("DOMContentLoaded", onLoad)
console.log(`${chrome.runtime.getManifest().name} loaded.`)
