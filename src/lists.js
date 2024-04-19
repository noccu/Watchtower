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
        for (let [plat, userList] of Object.entries(list.users)) {
            indexUsers(list, plat, userList)
        }
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
