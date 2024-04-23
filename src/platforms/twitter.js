const PATTERN = new RegExp("/(UserByScreenName|UserTweets|CommunityTweetsTimeline|TweetDetail)\\?")

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
        return this.endpoint.endsWith("me") ? true : false
    }
    // UserTweets
    isTweetList() {
        return this.endpoint.endsWith("s") ? true : false
    }
    // Community TL
    isCommunity() {
        return this.endpoint.startsWith("C") ? true : false
    }
    // Tweet detail/status
    isTweetDetail() {
        return this.endpoint.endsWith("l") ? true : false
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
    else if (reqType.isCommunity()) {
        mapUsers(resp.data.communityResults.result.ranked_community_timeline.timeline.instructions)
    }
    else if (reqType.isTweetDetail()) {
        mapUsers(resp.data.threaded_conversation_with_injections_v2.instructions)
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

/** Process API instructions to map Username -> ID */
function mapUsers(instructions) {
    for (let inst of instructions) {
        if (inst.type != "TimelineAddEntries") continue
        for (let entry of inst.entries) {
            let content = entry.content
            // Most things
            if (content.entryType.endsWith("Item")) {
                handleItem(content)
            }
            // TweetDetail (/status/)
            else if (content.entryType.endsWith("Module")) {
                for (let moduleEntry of content.items) {
                    handleItem(moduleEntry.item)
                }
            }
        }
    }
    console.debug("New map:", USER_MAP)
}

function handleItem(item) {
    if (item.itemContent?.itemType != "TimelineTweet") return
    mapFromTweetData(item.itemContent.tweet_results.result)
}

/** Extracts info from tweet data to create user map */
function mapFromTweetData(data){
    // Oh very fun, twitter. APIs should be consistent!
    data = data.tweet || data
    // let tweetId = data.rest_id
    let user = data.core.user_results.result
    let userId = user.rest_id
    let userHandle = user.legacy.screen_name
    USER_MAP[userHandle] = userId
    let secondaryTweetData = data.legacy.retweeted_status_result || data.quoted_status_result
    if (secondaryTweetData) {
        mapFromTweetData(secondaryTweetData.result)
    }
}

/**
 * @param {MutationRecord[]} recordList
 * @param {MutationObserver} obs
 */
function checkChanges(recordList, obs) {
    for (let record of recordList) {
        if (!record.target.childNodes[0]?.dataset?.testid?.startsWith("cell")) continue
        if (!trackUsers()) return
        obs.takeRecords()
        checkTweets()
        return
    }
}

function trackUsers() {
    if (USERNAME_ELEMENTS !== undefined) return true
    let userEle = document.querySelector("[data-testid='User-Name']")
    if (!userEle) return false
    USERNAME_ELEMENTS = document.getElementsByClassName(userEle.className)
    return true
}

function checkTweets() {
    //? Maybe try to link the tweet's rest_id from API?
    for (let userEl of USERNAME_ELEMENTS) {
        if (userEl.wtChecked) continue
        if (!userEl.dataset.testid?.startsWith("U")) continue
        // Quote tweets and maybe others do not have links on name.
        // Name span can be split by <img> when name has emotes.
        let nameEl = Array.prototype.find.call(
            userEl.getElementsByTagName("span"),
            el => el.textContent.startsWith("@")
        )
        if (!nameEl) {
            console.debug("Couldn't find name element:", userEl)
            return
        }
        let username = nameEl.textContent.slice(1)
        let userId = USER_MAP[username]
        if (!userId) {
            console.debug("Missing user ID:", username, userEl)
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
