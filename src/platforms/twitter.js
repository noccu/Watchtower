const PATTERN = new RegExp("/(HomeTimeline|UserByScreenName|UserTweets|CommunitiesRankedTimeline|CommunityTweetsTimeline|TweetDetail|BlockedAccountsAll)(?:\\?|$)")
const PLATFORM = "twitter"

// Markers
const LABEL = document.createElement("span")
LABEL.className = "tweet-label"
const LABEL_CONTAINER = document.createElement("div")
LABEL_CONTAINER.className = "tweet-label-container"
const MESSAGE = document.createElement("div")
MESSAGE.className = "profile-msg"
const MESSAGE_CONTAINER = document.createElement("div")
MESSAGE_CONTAINER.id = "profile-msg-container"


/** @type {Object<string, UserPromise>} */
const USER_MAP = {}

class UserPromise {
    isResolved = false
    resolve(x) {
        if (this.isResolved) return this
        if (this.promise) this.promise.resolve(x)
        else this.promise = Promise.resolve(x)
        this.isResolved = true
        return this
    }
    /** @returns {Promise<User>} */
    get() {
        if (this.promise) return this.promise
        let {promise, resolve} = Promise.withResolvers()
        promise.resolve = resolve
        this.promise = promise
        return promise
    }
}

/** @param {CustomEvent} ev */
async function parseResponse(ev) {
    let m = ev.detail.url.match(PATTERN)
    if (!m) return

    let reqType = m[1]
    let resp = JSON.parse(ev.detail.data)
    console.debug(`Parsing response for: ${reqType}`)
    //? Set a global state?
    switch (reqType) {
        case "UserByScreenName":
            mapUser(resp.data.user.result)
            console.debug("New map:", USER_MAP)
            break
        case "UserTweets":
            handleInstructions(resp.data.user.result.timeline_v2.timeline.instructions)
            break
        case "CommunityTweetsTimeline":
            handleInstructions(resp.data.communityResults.result.ranked_community_timeline.timeline.instructions)
            break
        case "CommunitiesRankedTimeline":
            handleInstructions(resp.data.viewer.ranked_communities_timeline.timeline.instructions)
            break
        case "TweetDetail":
            handleInstructions(resp.data.threaded_conversation_with_injections_v2.instructions)
            break
        case "HomeTimeline":
            handleInstructions(resp.data.home.home_timeline_urt.instructions)
            break
        case "BlockedAccountsAll":
            handleInstructions(resp.data.viewer.timeline.timeline.instructions)
            break
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
    switch (item.itemContent?.itemType) {
        case "TimelineTweet":
            mapFromTweetData(item.itemContent.tweet_results.result)
            break
        case "TimelineUser":
            mapUser(item.itemContent.user_results.result)
            break
    }
}

/** Builds map from API user data obj.
 * @returns {User}
*/
function mapUser(userData){
    let name = userData.legacy.screen_name
    let curUser = USER_MAP[name]
    // Already mapped
    if (curUser?.isResolved) return
    let id = userData.rest_id
    let hash = userData.id
    let user = {
        user: name,
        id,
        hash
    }
    if (!curUser) USER_MAP[name] = new UserPromise().resolve(user)
    else curUser.resolve(user)
}

/** Map relevant users from API tweet data. */
function mapFromTweetData(data){
    // Oh very fun, twitter. APIs should be consistent!
    data = data.tweet || data
    // let tweetId = data.rest_id
    mapUser(data.core.user_results.result)
    let secondaryTweetData = data.legacy.retweeted_status_result || data.quoted_status_result
    if (secondaryTweetData?.result) {
        mapFromTweetData(secondaryTweetData.result)
    }
    let communityData = data.community_results
    if (communityData?.result) {
        for (var user of communityData.result.members_facepile_results) {
            mapUser(user.result)
        }
    }
}

/**
 * @param {MutationRecord[]} recordList
 * @param {MutationObserver} obs
 */
function checkChanges(recordList, obs) {
    for (let record of recordList) {
        // Tweets container, every tweet load.
        if (record.target.childNodes[0]?.dataset?.testid?.startsWith("cell")) {
            processProfile() // Profile is always accompanied by tweets
            processTweets()
            return
        }
    }
}

/** Utility function to deal with special cases. */
async function processProfile() {
    let nameEle = document.querySelector("[data-testid='UserName']")
    let user = await findUserFromNameContainer(nameEle)
    if (!user || user.user == nameEle.lastUser) return
    nameEle.lastUser = user.user
    checkUser(user).then(data => markProfile(data))
}

/** Finds usernames in tweets and sends unprocessed ones for marking. */
async function processTweets() {
    //? Maybe try to link the tweet's rest_id from API?
    for (let element of document.querySelectorAll("[data-testid='User-Name']")) {
        if (element.wtChecked) continue
        element.wtChecked = true
        var user = await findUserFromNameContainer(element)
        checkUser(user).then(data => markTweet(element, data))
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
    document.querySelector("[data-testid='UserName']").append(container)
}

/**
 * @param {HTMLElement} userEl
 * @param {LoadedUser} user
*/
function markTweet(userEl, user) {
    if (!user) return
    // Empty container used to enforce horizontal labels in all(?) cases.
    let container = LABEL_CONTAINER.cloneNode()
    for (let list of user.onLists) {
        let label = LABEL.cloneNode()
        label.textContent = list.meta.label
        label.style.backgroundColor = list.meta.color
        container.append(label)
    }
    userEl.append(container)
}

// Utils //

/** @param {HTMLElement} element */
function findNameElement(element) {
    if (!element || !element.dataset.testid?.startsWith("U")) return
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
        // console.debug("Missing user ID:", username, element, nameEl)
        USER_MAP[username] = user = new UserPromise()
    }
    return user.get()
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
        let user = USER_MAP[username]
        if (!user) {
            answer(undefined)
            return
        }
        user.get().then(user => {
            answer({
                user,
                platform: PLATFORM
            })
        })
        return true
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
