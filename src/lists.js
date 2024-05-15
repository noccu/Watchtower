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
        this.reports = list.reports
        /** Link to full list as originally loaded from storage. Not serialized. @readonly */
        this.full = list
        Object.defineProperty(this, "full", {
            enumerable: false,
            writable: false
        })
    }
    /** @param {List} newData */
    update(newData) {
        this.meta = this.full.meta = newData.meta
        this.full.users = newData.users
        Object.assign(this.local, newData.local)
    }
    /**  @param {CachedUser} loadedUser */
    addReport(platform, loadedUser) {
        loadedUser.addToList(this)
        // Report data
        if (!this.reports[platform]) {
            this.reports[platform] = []
        }
        if (this.reports[platform].some(u => u.id == loadedUser.id)) {
            return false
        }
        this.reports[platform].push(loadedUser.user)
        return true
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
    /** @param {CachedList} list */
    isOnList(list) {
        return this.onLists.includes(list)
    }
    /** @param {CachedList} list */
    addToList(list) {
        if (this.isOnList(list)) return false
        this.onLists.push(list)
        return true
    }
}


/** Initializes stored lists for use
 * @param {List[]} lists
*/
export function loadLists(lists) {
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
    const allUsers = Object.entries(list.full.users).concat(Object.entries(list.reports))
    for (var [plat, platUsers] of allUsers) {
        for (var user of platUsers) {
            indexSingleUser(plat, user, list)?.addToList(list)
        }
    }
}

/** Add a user to the index if new.
 * @param {PLATFORM} plat
 * @param {User} user
*/
export function indexSingleUser(plat, user) {
    if (!(plat in PLATFORMS)) return
    let loadedUser = lookupUser(plat, user)
    if (!loadedUser) {
        loadedUser = new CachedUser(user)
        USERS[plat][user.id] = loadedUser
    }
    return loadedUser
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

export function getListBySource(src) {
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

/** Updates the raw, saved list of a LoadedList in-place.
 * @param {CachedList} list */
async function updateRawList(list) {
    console.log(`Updating list: ${list.meta.name}`)
    try {
        var newList = await downLoadList(list.local.source)
        list.update(newList)
    }
    catch {
        console.warn(`Failed to update list: ${list.meta.name}`)
        return
    }
    return newList
}

function updateAllLists() {
    console.log("Started updating all lists.")
    for (var list of LISTS) {
        updateRawList(list)
    }
    saveConfig("lists")
}

export function checkListUpdates() {
    console.debug("Checking list updates.")
    let set = getConfig("settings")
    let now = Date.now()
    if (now - set.lastUpdate > set.updateInterval) {
        console.debug("Updates required.")
        changeSetting("lastUpdate", now)
        saveConfig("settings")
        return updateAllLists()
    }
    return Promise.resolve()
}

/** Update a list by source URL/UID */
export async function updateList(src) {
    let list = getListBySource(src)
    await updateRawList(list)
    markConfigChanged()
    return list
}

/** Export the list to disk
 * @param {LocalListData["exportOptions"]} options
*/
export function exportList(src, options) {
    const list = getListBySource(src).full
    const exportedList = {
        meta: structuredClone(list.meta),
        users: structuredClone(list.users)
    }
    if (options.includeReports) {
        for (var [plat, platReports] of Object.entries(list.reports)) {
            for (var reportedUser of platReports) {
                exportedList.users[plat].push(reportedUser)
            }
        }
    }
    // Store last used options
    list.local.exportOptions = options
    markConfigChanged()
    return { localData: list.local, exportedList }
}

/** Remove a list by source URL/UID */
export function removeList(src) {
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
    let list = await fetch(url).then(
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
    list.local = {
        source: url,
        size: Object.values(list.users).reduce((total, cur) => total + cur.length, 0)
    }
    // Add the object to store reports in locally
    list.reports = {}

    console.log("List fetched")
    return list
}
