const PATTERN = new RegExp("/(UserByScreenName|UserTweets)\\?")

// Markers
const LABEL = document.createElement("span")
LABEL.className = "tweet-label"
const MESSAGE = document.createElement("div")
MESSAGE.className = "profile-mark-msg"

const USER_MAP = {}
/** @type {HTMLCollectionOf<HTMLElement>} */
var USERNAME_ELEMENTS

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
        //todo: add user to map?
    }
    else if (reqType.isTweetList()) {
        mapUsers(resp.data.user.result.timeline_v2.timeline.instructions)
    }
    console.debug(`Response for: ${reqType.endpoint}`)
    // console.debug(`Response Body: ${resp}`)
}

/** @returns {Promise<ListMarkers[]>} */
function checkUser(userId) {
    return chrome.runtime.sendMessage({
        action: "check-user",
        platform: "twitter",
        id: userId
    })
}

/** @param {ListMarkers[]} onLists */
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

//! If using Observer: Skip the observer when adding labels
/**
 * @param {HTMLElement} userEl
 * @param {ListMarkers[]} onLists
*/
function markTweet(userEl, onLists) {
    if (!onLists) return
    for (let list of onLists) {
        let label = LABEL.cloneNode()
        label.textContent = list.label
        label.style.backgroundColor = list.color
        userEl.append(label)
    }
}

/** Extracts the info we want from twitter instructions */
function mapUsers(instructions) {
    for (let inst of instructions) {
        if (inst.type != "TimelineAddEntries") continue
        for (let entry of inst.entries) {
            if (entry.content.itemContent?.itemType != "TimelineTweet") continue
            entry = entry.content.itemContent
            // let tweetId = entry.tweet_results.result.rest_id
            let user = entry.tweet_results.result.core.user_results.result
            let userId = user.rest_id
            let userHandle = user.legacy.screen_name
            //todo: extract retweets
            USER_MAP[userHandle] = userId
        }
    }
    console.debug("New map:", USER_MAP)
}

/** @param {MutationRecord[]} recordList */
function checkChanges(recordList, obs) {
    for (let record of recordList) {
        // if (record.addedNodes.length == 0) continue
        // if (record.addedNodes.length != 0) console.debug("Record target:", record.target)
        if (record.target.childNodes[0]?.dataset?.testid != "cellInnerDiv") continue
        for (let node of record.addedNodes) {
            // if (node.nodeType != Node.ELEMENT_NODE) continue
            console.debug("Added node:", node, node.textContent)
            if (USERNAME_ELEMENTS === undefined && !trackUsers()) return
            checkTweets()
            return
        }
    }
}

function trackUsers() {
    let userEle = document.querySelector("[data-testid='User-Name']")
    if (!userEle) return false
    USERNAME_ELEMENTS = document.getElementsByClassName(userEle.className)
    return true
}

function checkTweets() {
    for (let userEl of USERNAME_ELEMENTS) {
        if (userEl.wtChecked) continue
        if (!userEl.dataset.testid?.startsWith("U")) continue
        let username = userEl.getElementsByTagName("span")[3].textContent.slice(1)
        let userId = USER_MAP[username]
        if (!userId) {
            console.debug("Missing user ID:", username)
            continue
        }
        checkUser(userId).then(listMetas => markTweet(userEl, listMetas))
        userEl.wtChecked = true
    }
}

function onLoad() {
    globalThis.addEventListener("wt-xhr", parseResponse)
    window.addEventListener("DOMContentLoaded", e => {
        let tweetObserver = new MutationObserver(checkChanges)
        tweetObserver.observe(
            // document.querySelector("div[aria-label='Home timeline']"),
            document.getElementById("react-root"),
            {childList: true, subtree: true, }
        )
    })
}

onLoad()
console.log(`${chrome.runtime.getManifest().name} loaded.`)
