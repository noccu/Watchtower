
const PATTERN = new RegExp("api/(notes/timeline|users/show|users/notes)(?:\\?|$)")
const PLATFORM = "misskey"

// const POSTS = document.getElementsByClassName("xcSej")
const POST_HEADERS = document.getElementsByClassName("xCPfz")

// Markers
const LABEL = document.createElement("span")
LABEL.className = "wt-label"
const LABEL_CONTAINER = document.createElement("div")
LABEL_CONTAINER.className = "wt-label-container"
const MESSAGE = document.createElement("div")
MESSAGE.className = "wt-msg"
const MESSAGE_CONTAINER = document.createElement("div")
MESSAGE_CONTAINER.id = "wt-msg-container"


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
    static resolve(data) {
        return new UserPromise().resolve(data)
    }
}

/** @param {CustomEvent} ev */
function parseResponse(ev) {
    let m = ev.detail.url.match(PATTERN)
    if (!m) return

    let reqType = m[1]
    let data = ev.detail.data
    // let payload = ev.detail.payload ? JSON.parse(ev.detail.payload) : undefined
    console.debug(`Parsing response for: ${reqType}`)
    //? Set a global state?
    switch (reqType) {
        case "users/show":
            mapUser(data)
            console.debug("New map:", USER_MAP)
            // if (payload?.username) setTimeout(processProfile, 500)
            break
        case "users/notes":
        case "notes/timeline":
            mapUsersFromTimeline(data)
            // setTimeout(processPosts, 500)
            break
    }
}

/**
 * @param {MutationRecord[]} recordList
 * @param {MutationObserver} obs
 */
function checkChanges(_recordList, obs) {
    //? Attempt to minimize calls by clearing queue. Does this help?
    obs.takeRecords()
    processProfile()
    processNotes()
    // Class names approach ran into trouble, not sure why.
    // Class names: main load incl profile = xt54V, notes container added = xuz3q, notes added: xcSej (addedNodes)
    // Timeouts on API calls are an alternative.
}

/** Process API instructions to map Username -> ID */
function mapUsersFromTimeline(timeline) {
    for (let post of timeline) {
        if (!post.userId) continue
        mapUser(post.user)
        if (post.renote) {
            mapUser(post.renote.user)
        }
    }
    console.debug("New map:", USER_MAP)
}

/** Builds map from API user data obj. */
function mapUser(userData){
    let curUser = USER_MAP[userData.username]
    // Already mapped
    if (curUser?.isResolved) return
    /** @type {User} */
    let user = {
        name: userData.username,
        id: userData.id,
        aliases: userData.alsoKnownAs,
        host: userData.host
    }
    if (!curUser) USER_MAP[user.name] = UserPromise.resolve(user)
    else curUser.resolve(user)
}

async function processProfile() {
    let nameEle = document.querySelector(".username")
    if (!nameEle) return
    let username = nameEle.firstElementChild.firstElementChild.textContent.slice(1)
    let user = await USER_MAP[username].get()
    if (!user || user.name == nameEle.lastUser) return
    nameEle.lastUser = user.name
    checkUser(user).then(data => markProfile(data))
}

/** Finds usernames in notes and sends unprocessed ones for marking. */
async function processNotes() {
    for (let header of POST_HEADERS) {
        if (header.wtChecked) continue
        header.wtChecked = true
        // var userId = header.firstElementChild._userPreviewDirective_.user
        var user = await findUserFromElement(header)
        checkUser(user).then(data => markNote(header, data))
    }
}

/** @param {SerializedUser} userData */
function markProfile(userData) {
    // Clear existing messages if they exist from in-place updates.
    document.getElementById(MESSAGE_CONTAINER.id)?.remove()
    if (!userData) return // Not on a list
    let container = MESSAGE_CONTAINER.cloneNode()
    for (var list of userData.onLists) {
        /** @type {HTMLDivElement} */
        var msgCopy = MESSAGE.cloneNode()
        msgCopy.textContent = list.meta.msg
        msgCopy.style.backgroundColor = list.meta.color
        container.append(msgCopy)
    }
    document.querySelector(".roles").after(container)
}

/**
 * @param {HTMLElement} userEl
 * @param {SerializedUser} user
*/
function markNote(userEl, user) {
    if (!user) return
    let container = LABEL_CONTAINER.cloneNode()
    for (var list of user.onLists) {
        var label = LABEL.cloneNode()
        label.textContent = list.meta.label
        label.style.backgroundColor = list.meta.color
        container.append(label)
    }
    userEl.append(container)
}

// Utils //

/** @param {HTMLElement} element */
function findUserFromElement(element) {
    let user
    let username = element.children?.[1]?.textContent.slice(1)
    if (username) {
        user = USER_MAP[username]
    }
    // else {
    //     let userId = element.firstElementChild._userPreviewDirective_?.user
    //     if (userId) user = {id: userId}
    // }
    if (!user) {
        USER_MAP[username] = user = new UserPromise()
    }
    return user.get()
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
        let username = target.pathname.split("/")[1]?.slice(1)
        let user = USER_MAP[username]
        if (!user) {
            answer(undefined)
            return
        }
        user.get().then(data => {
            answer({
                ...data,
                platform: PLATFORM
            })
        })
        return true
    }
}

function onLoad() {
    globalThis.addEventListener("wt-fetch", parseResponse)
    chrome.runtime.onMessage.addListener(msgResponder)
    window.addEventListener("DOMContentLoaded", () => {
        let obs = new MutationObserver(checkChanges)
        obs.observe(
            document.body,
            {childList: true, subtree: true, }
        )
    })
}

onLoad()
console.log(`${chrome.runtime.getManifest().name} loaded.`)
