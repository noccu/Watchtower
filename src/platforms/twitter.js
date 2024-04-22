const PATTERN = new RegExp("/(UserByScreenName|UserTweets)\\?")

// Markers
const LABEL = document.createElement("span")
LABEL.className = "profile-label"
const MESSAGE = document.createElement("div")
MESSAGE.className = "profile-mark-msg"

class RequestType {
    constructor(endpoint) {
        this.endpoint = endpoint
    }
    // UserByScreenName -> Profile page only (does not fire on hover)
    isProfile() {
        return this.endpoint.endsWith("e") ? true : false
    }
    // UserTweets
    isTweetList() {
        return this.endpoint.endsWith("s") ? true : false
    }
}


/** @param {CustomEvent} ev */
async function parseResponse(ev) {
    let m = ev.detail.url.match(PATTERN)
    if (!m) return

    let reqType = new RequestType(m[1])
    let resp = JSON.parse(ev.detail.data)
    //? Set a global state?
    if (reqType.isProfile()) {
        checkUser(resp.data.user.result.rest_id).then(markProfile)
    }
    else if (reqType.isTweetList()) {
        //todo: go through tweets to mark or hide them
    }
    console.debug(`Response for: ${reqType.endpoint}`)
    // console.debug(`Response Body: ${resp}`)
}

function checkUser(userId) {
    return chrome.runtime.sendMessage({
        action: "check-user",
        platform: "twitter",
        id: userId
    })
}

/** @param {CachedUser} onLists */
function markProfile(onLists) {
    if (!onLists) return // Not on a list
    for (let list of onLists) {
        /** @type {HTMLDivElement} */
        let msgCopy = MESSAGE.cloneNode()
        msgCopy.textContent = `${list.label}\n${list.msg}`
        msgCopy.style.backgroundColor = list.color
        document.querySelector("[data-testid='UserName']").append(msgCopy)
    }
}

function onLoad() {
    globalThis.addEventListener("wt-xhr", parseResponse)
}

onLoad()
console.log(`${chrome.runtime.getManifest().name} loaded.`)
