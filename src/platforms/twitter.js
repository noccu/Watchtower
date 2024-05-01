const PATTERN = new RegExp("/(HomeTimeline|UserByScreenName|UserTweets|CommunityTweetsTimeline|TweetDetail)(?:\\?|$)")
const PLATFORM = "twitter"

// Markers
const LABEL = document.createElement("span")
LABEL.className = "tweet-label"
const MESSAGE = document.createElement("div")
MESSAGE.className = "profile-msg"
const MESSAGE_CONTAINER = document.createElement("div")
MESSAGE_CONTAINER.id = "profile-msg-container"

/** @type {User[]} */
const USER_MAP = {}
const NAME_ELEMENTS = {
    /** @type {HTMLCollectionOf<HTMLElement>} */
    profile: undefined,
    /** @type {HTMLCollectionOf<HTMLElement>} */
    tweets: undefined
}

class RequestType {
    constructor(endpoint) {
        this.endpoint = endpoint
    }
    // UserByScreenName -> Profile page only (does not fire on hover)
    isProfile() { return this.endpoint.endsWith("me") ? true : false }
    // UserTweets
    isTweetList() { return this.endpoint.endsWith("s") ? true : false }
    // Community TL
    isCommunity() { return this.endpoint.startsWith("C") ? true : false }
    // Tweet detail/status
    isTweetDetail() { return this.endpoint.endsWith("l") ? true : false }
    // Home timeline
    isHome() { return this.endpoint.startsWith("H") ? true : false }
}


/** @param {CustomEvent} ev */
function parseResponse(ev) {
    let m = ev.detail.url.match(PATTERN)
    if (!m) return

    let reqType = new RequestType(m[1])
    let resp = JSON.parse(ev.detail.data)
    console.debug(`Parsing response for: ${reqType.endpoint}`)
    //? Set a global state?
    if (reqType.isProfile()) {
        mapUser(resp.data.user.result)
        console.debug("New map:", USER_MAP)
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
    // console.debug(`Response Body: ${resp}`)
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
        //! Debug
        // if (record.addedNodes.length == 1) console.log(record.target, record.addedNodes[0])
        // else console.log(record.target, record.addedNodes)

        // Profile container, first profile visit.
        if (record.target.childNodes[1]?.dataset?.testid?.[4] == "N") {
            trackProfileName()
            processProfile()
        }
        // Tweets container, every tweet load.
        else if (record.target.childNodes[0]?.dataset?.testid?.startsWith("cell")) {
            trackTweetNames()
            processTweets()
        }
    }
}

// Could hardcode classes but gambling on datasets staying consistent longer.
// Hope classes remain unique.
function trackProfileName() {
    if (NAME_ELEMENTS.profile) return
    let profileEle = document.querySelector("[data-testid='UserName']")
    if (!profileEle) return false
    let profileNameObs = new MutationObserver(processProfile)
    // Doesn't trigger without subtree. Reasons…
    profileNameObs.observe(profileEle, {characterData: true, subtree: true})
    NAME_ELEMENTS.profile = profileEle
    return true
}
function trackTweetNames() {
    if (NAME_ELEMENTS.tweets) return true
    let tweetUserEle = document.querySelector("[data-testid='User-Name']")
    if (!tweetUserEle)  return false
    NAME_ELEMENTS.tweets = document.getElementsByClassName(tweetUserEle.className)
    return true
}

/** Utility function to deal with special cases. */
function processProfile() {
    let user = findUserFromNameContainer(NAME_ELEMENTS.profile)
    checkUser(user).then(data => markProfile(data))
}

/** Finds usernames in tweets and sends unprocessed ones for marking. */
function processTweets() {
    //? Maybe try to link the tweet's rest_id from API?
    for (let element of NAME_ELEMENTS.tweets) {
        if (element.wtChecked) continue
        var user = findUserFromNameContainer(element)
        checkUser(user).then(data => markTweet(element, data))
        element.wtChecked = true
    }
}

/** @param {LoadedUser} user */
function markProfile(user) {
    // Clear existing lists as Twitter edits profile info in-place.
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
    NAME_ELEMENTS.profile.append(container)
}

/**
 * @param {HTMLElement} userEl
 * @param {LoadedUser} user
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

// Utils //

/** @param {HTMLElement} element */
function findNameElement(element) {
    if (!element.dataset.testid?.startsWith("U")) return
    // Quote tweets and maybe others do not have links on name.
    // Name span can be split by <img> when name has emotes.
    let nameEl = Array.prototype.find.call(
        element.getElementsByTagName("span"),
        el => el.textContent.startsWith("@")
    )
    if (!nameEl) {
        console.debug("Couldn't find name element for:", element)
        return
    }
    return nameEl
}

/** @param {HTMLElement} element */
function findUserFromNameContainer(element) {
    let nameEl = findNameElement(element)
    if (!nameEl) return
    let username = nameEl.textContent.slice(1)
    let user = USER_MAP[username]
    if (!user) {
        console.debug("Missing user ID:", username, element, nameEl)
    }
    return user
}

// Communication //

/** @returns {Promise<LoadedUser>} */
function checkUser(user) {
    console.debug("Checking user:", user)
    if (!user) return Promise.resolve()
    return chrome.runtime.sendMessage({
        action: "check-user",
        platform: "twitter",
        user
    })
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
