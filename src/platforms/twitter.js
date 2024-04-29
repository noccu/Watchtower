const PATTERN = new RegExp("/(HomeTimeline|UserByScreenName|UserTweets|CommunityTweetsTimeline|TweetDetail)(?:\\?|$)")
const PLATFORM = "twitter"

// Markers
const LABEL = document.createElement("span")
LABEL.className = "tweet-label"
const MESSAGE = document.createElement("div")
MESSAGE.className = "profile-mark-msg"

/** @type {User[]} */
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
    // Home timeline
    isHome() {
        return this.endpoint.startsWith("H") ? true : false
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
        checkUser(mapUser(resp.data.user.result)).then(markProfile)
    }
    else if (reqType.isTweetList()) {
        handleInstructions(resp.data.user.result.timeline_v2.timeline.instructions)
    }
    else if (reqType.isCommunity()) {
        handleInstructions(resp.data.communityResults.result.ranked_community_timeline.timeline.instructions)
    }
    else if (reqType.isTweetDetail()) {
        handleInstructions(resp.data.threaded_conversation_with_injections_v2.instructions)
    }
    else if (reqType.isHome()) {
        handleInstructions(resp.data.home.home_timeline_urt.instructions)
    }
    console.debug(`Response for: ${reqType.endpoint}`)
    // console.debug(`Response Body: ${resp}`)
}

/** @returns {Promise<LoadedUser[]>} */
function checkUser(user) {
    return chrome.runtime.sendMessage({
        action: "check-user",
        platform: "twitter",
        user
    })
}

/** @param {LoadedUser} user */
function markProfile(user) {
    if (!user) return // Not on a list
    for (let list of user.onLists) {
        /** @type {HTMLDivElement} */
        let msgCopy = MESSAGE.cloneNode()
        msgCopy.textContent = `${list.meta.label}\n${list.meta.msg}`
        msgCopy.style.backgroundColor = list.meta.color
        document.querySelector("[data-testid='UserName']").append(msgCopy)
    }
}

//! If using Observer: Skip the observer when adding labels
/**
 * @param {HTMLElement} userEl
 * @param {LoadedUser[]} user
*/
function markTweet(userEl, user) {
    if (!user) return
    for (let list of user.onLists) {
        let label = LABEL.cloneNode()
        label.textContent = list.meta.label
        label.style.backgroundColor = list.meta.color
        userEl.append(label)
    }
}

/** Process API instructions to map Username -> ID */
function handleInstructions(instructions) {
    for (let inst of instructions) {
        if (inst.type == "TimelinePinEntry") {
            handleItem(inst.entry.content)
            continue
        }
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

/** Builds map from API user data obj.
 * @returns {User}
*/
function mapUser(userData){
    let user = userData.legacy.screen_name
    if (user in USER_MAP) return
    let id = userData.rest_id
    let hash = userData.id
    return USER_MAP[user] = {
        user,
        id,
        hash
    }
}

/** Map relevant users from API tweet data. */
function mapFromTweetData(data){
    // Oh very fun, twitter. APIs should be consistent!
    data = data.tweet || data
    // let tweetId = data.rest_id
    mapUser(data.core.user_results.result)
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
        let user = USER_MAP[username]
        if (!user) {
            console.debug("Missing user ID:", username, userEl)
            continue
        }
        checkUser(user).then(onLists => markTweet(userEl, onLists))
        userEl.wtChecked = true
    }
}

// Reports
function msgResponder(msg, sender, answer) {
    console.debug("Received:", msg)
    if (msg.action == "get-user") {
        let target = new URL(msg.targetLink)
        let username = target.pathname.split("/")[1]
        answer({
            user: USER_MAP[username],
            platform: PLATFORM
        })
    }
}

function onLoad() {
    globalThis.addEventListener("wt-xhr", parseResponse)
    chrome.runtime.onMessage.addListener(msgResponder)
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
