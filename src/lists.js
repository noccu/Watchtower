import { changeSetting, getConfig, markConfigChanged, saveConfig } from "./config.js"
import { PLATFORMS } from "./constants.js"

/** Pointers to loaded list data, users excluded.
 * @type {CachedList[]} */
const LISTS = []
/** Stores user index
* @type {PlatformKeyed<Object<string, CachedUser>>}} */
const USERS = {}

/** A {@link List} wrapper for most uses & serialization. Serializes to {@link SerializedList}. */
class CachedList {
    /** @param {List} list */
    constructor(list) {
        this.meta = list.meta
        this.local = list.local
        /** Link to full list as originally loaded from storage. Not serialized. @readonly */
        this.full = list
        Object.defineProperty(this, "full", {
            enumerable: false,
            writable: false
        })
    }
}

/** A {@link User} wrapper for most uses & serialization. Serializes to {@link SerializedUser} */
class CachedUser {
    /** @param {User} user */
    constructor(user) {
        this.user = user
        /** Contains refs to lists the user is on.
        * @type {CachedList[]} */
        this.onLists = []
    }
}


/** Initializes stored lists for use
 * @param {List[]} lists
*/
export async function loadLists(lists) {
    LISTS.length = 0
    // Set up the per-platform cache
    for (var plat in PLATFORMS) {
        USERS[plat] = {}
    }
    for (var list of lists) {
        loadSingleList(list)
    }
}

/** @param {List} listData */
function loadSingleList(listData) {
    let list = new CachedList(listData)
    LISTS.push(list)
    indexUsers(list)
}

/** Indexes users from all platforms for quicker lookup.
 * The index is stored in the global var USERS.
 * @param {CachedList} list
*/
function indexUsers(list) {
    for (var [plat, platUsers] of Object.entries(list.full.users)) {
        for (var user of platUsers) {
            // Link user to list.
            /** @type {CachedUser} */
            let loadedUser = USERS[plat][user.id] || new CachedUser(user)
            loadedUser.onLists.push(list)
            USERS[plat][user.id] = loadedUser
        }
    }
}

/**
 * @param {PLATFORM} plat
 * @param {User} user */
export function lookupUser(plat, user) {
    return USERS[plat][user.id]
}

export function getLists() {
    return LISTS
}

/** @param {PLATFORM} plat */
export function getPlatformList(plat) {
    return USERS[plat]
}

function getListBySource(src) {
    return LISTS.find(l => l.local.source == src)
}

export function getReportableLists() {
    return LISTS.filter(l => l.meta.reportType)
}

/** Downloads a list and adds it to extension storage.
 * @param {string} url The URL to a list.
 */
export async function addList(url) {
    console.debug("Add new list requested.")
    let l = getListBySource(url)
    if (l) {
        console.debug(`List already added: "${l.meta.name}" from ${l.local.source}`)
        return "List already exists"
    }
    let data = await downLoadList(url)

    getConfig("lists").push(data)
    markConfigChanged()
    // globalThis.dispatchEvent(new CustomEvent("listsChanged", {change: "add", list: data}))
    loadSingleList(data)

    console.debug("List added:", data.meta.name)
    return data
}

async function updateLists() {
    console.log("Updating lists.")
    let savedLists = getConfig("lists")
    for (var idx = 0; idx < savedLists.length; idx++) {
        try {
            let newList = await downLoadList(savedLists[idx].local.source)
            savedLists[idx].meta = newList.meta
            savedLists[idx].users = newList.users
        }
        catch {
            console.warn(`Failed to update list: ${savedLists[idx].meta.name}`)
            continue
        }
    }
    saveConfig("lists")
}

export async function checkListUpdates() {
    console.debug("Checking list updates.")
    let set = getConfig("settings")
    let now = Date.now()
    if (now - set.lastUpdate > set.updateInterval) {
        console.debug("Updates required.")
        changeSetting("lastUpdate", now)
        saveConfig("settings")
        return updateLists()
    }
}

/** Remove a list by source URL/UID */
export async function removeList(src) {
    console.debug("Delete list requested:", src)
    let list = getListBySource(src)
    if (!list) {
        console.debug("No such list found.")
        return false
    }

    for (var [plat, platUsers] of Object.entries(list.full.users)) {
        for (var user of platUsers) {
            var onList = lookupUser(plat, user).onLists
            onList.splice(onList.indexOf(list), 1)
        }
    }

    let savedLists = getConfig("lists")
    savedLists.splice(savedLists.indexOf(list.full), 1)
    markConfigChanged()
    // globalThis.dispatchEvent(new CustomEvent("listsChanged", {change: "del", list: list}))
    LISTS.splice(LISTS.indexOf(list), 1)

    console.debug("Deleted list:", list.meta.name)
    return true
}

/** Downloads the given URL.
 * @param {str} url
*/
async function downLoadList(url) {
    console.log(`Fetching new list: ${url}`)
    /** @type {List} */
    let data = await fetch(url).then(
        data => data.json().catch(e => {
            console.error(`URL did not return JSON data.\n${e}`)
            throw e
        }),
        e => {
            console.error(`Failed to download list.\n${e}`)
            throw e
        }
    )
    // The above should throw out of the function if a problem occurs.

    // Add some local data
    data.local = {
        source: url,
        size: Object.values(data.users).reduce((total, cur) => total + cur.length, 0)
    }

    console.log("List fetched")
    return data
}
