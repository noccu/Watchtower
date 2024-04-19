import {PLATFORMS} from "./constants.js"

// Store loaded lists
var LISTS
const USERS = {}
//todo: Only load lists when activated from content script?


/** Simple util function to only get lists, fallback to a default, and log errors */
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

export function lookupUser(plat, userMainKey) {
    return USERS[plat][userMainKey]
}

/** Adds a list to the saved lists in local storage.
 * @param {List} listData The JSON data of a list.
 * @returns {List} The list data/JSON that was given in, for chaining.
 */
async function saveNewList(listData) {
    let savedLists = await retrieveLists()
    savedLists.push(listData)
    chrome.storage.local.set({"lists": savedLists})
    return listData
}

/** Downloads the given URL and adds it as a list. */
export async function downLoadList(url) {
    console.debug("list.js", USERS) //! dbg

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
    // Add some local data
    data.source = url
    data.size = Object.values(data.users).reduce((total, cur) => total + cur.length, 0)
    // Save list
    //? Could this cause data loss/corruption? Especially in loops.
    saveNewList(data).then(loadSingleList)
    return data
}
