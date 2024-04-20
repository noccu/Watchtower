import {PLATFORMS} from "./constants.js"

/** Stores loaded lists
 * @type {List[]} */
var LISTS
/** Stores user index */
const USERS = {}
//todo: Only load lists when activated from content script?


/** Simple util function to only get lists, fallback to a default, and log errors
 * @returns {Promise<List[]>}
*/
function retrieveLists() {
    return chrome.storage.local.get({"lists": []}).then(data => data.lists, console.error)
}

/** Load lists from storage
 *  @param {List[]} [lists] An array of lists to load. Falls back to stored lists if undefined
 */
export async function loadLists(lists) {
    LISTS = lists || await retrieveLists()
    // Set up the per-platform cache
    for (let plat in PLATFORMS) {
        USERS[plat] = {}
    }
    // Index users for lookup
    for (let list of LISTS) {
        loadSingleList(list)
        delete list.users
    }
}

/** @param {List} listData */
async function loadSingleList(listData) {
    for (let [plat, userList] of Object.entries(listData.users)) {
        indexUsers(listData, plat, userList)
    }
}

/** Indexes users listed under a platform for quicker lookup.
 * The index is stored in the global var USERS.
 * @param {List} list
 * @param {string} plat
 * @param {User[]} userList
*/
function indexUsers(list, plat, userList) {
    let mainKey = PLATFORMS[plat]
    for (let user of userList) {
        let userKey = user[mainKey]
        // Swap in existing if found, effectively shadowing dupe user entries.
        user = USERS[plat][userKey] || user
        // Already indexed, update/combine lists.
        if (user.onLists) {
            user.onLists.push(list)
            // Could delete dupes to save a bit of ram I guess?
            continue
        }
        // Add to index
        user.onLists = [list]
        USERS[plat][userKey] = user
    }
}

/** @returns {CachedUser | undefined} */
export function lookupUser(plat, userMainKey) {
    return USERS[plat][userMainKey]
}

export function getPlatformList(plat) {
    return USERS[plat]
}

function getListBySource(src) {
    return LISTS.find(l => l.source == src)
}

/** Downloads a list and adds it to extension storage.
 * @param {string} url The URL to a list.
 * @returns {List} The list data/JSON that was given in, for chaining.
 */
export async function saveNewList(url) {
    //todo: check if already saved
    console.debug("Add new list requested")
    let data = await downLoadList(url)
    // Add some local data
    data.source = url
    data.size = Object.values(data.users).reduce((total, cur) => total + cur.length, 0)

    let savedLists = await retrieveLists()
    savedLists.push(data)
    chrome.storage.local.set({"lists": savedLists})

    loadSingleList(data)
    return data
}

/** Remove a list by source URL/UID */
export async function deleteList(src) {
    console.debug("Delete list requested:", src)
    let listRef = getListBySource(src)
    if (!listRef) {
        console.debug("No such list found.")
        return false
    }

    LISTS.splice(LISTS.indexOf(listRef), 1)
    for (let plat in USERS) {
        Object.values(USERS[plat]).forEach(user => {
            user.onLists.splice(user.onLists.indexOf(listRef), 1)
        })
    }

    let savedLists = await retrieveLists()
    savedLists.splice(savedLists.findIndex(sl => sl.source = listRef.source), 1)
    chrome.storage.local.set({"lists": savedLists})

    console.debug("Deleted list:", listRef.name)
    return true
}

/** Downloads the given URL and adds it as a list.
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
    console.log("List fetched")
    return data
}
