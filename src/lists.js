import { markConfigChanged } from "./config.js"
import {PLATFORMS} from "./constants.js"

/** Quick pointer to loaded lists
 * @type {List[]} */
var LISTS
/** Stores user index */
const USERS = {}


/** Initializes stored lists for use */
export async function loadLists(lists) {
    LISTS = lists
    // Set up the per-platform cache
    for (let plat in PLATFORMS) {
        USERS[plat] = {}
    }
    // Index users for lookup
    for (let list of LISTS) {
        loadSingleList(list)
        // delete list.users
    }
}

/** @param {List} listData */
function loadSingleList(listData) {
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
        // Link user to list.
        let onLists = USERS[plat][userKey]
        if (onLists) {
            onLists.push(list)
            continue
        }
        USERS[plat][userKey] = [list]
    }
}

/** @returns {ListMarkers | undefined} */
export function lookupUser(plat, userMainKey) {
    /** @type {List[]} */
    let onLists = USERS[plat][userMainKey]
    if (!onLists) return
    return onLists.map(list => {
        return {
            label: list.label,
            msg: list.msg,
            color: list.color
        }
    })
}

export function getPlatformList(plat) {
    return USERS[plat]
}

function getListBySource(src) {
    return LISTS.find(l => l.source == src)
}

/** Downloads a list and adds it to extension storage.
 * @param {string} url The URL to a list.
 */
export async function saveNewList(url) {
    //todo: check if already saved
    console.debug("Add new list requested")
    let data = await downLoadList(url)
    // Add some local data
    data.source = url
    data.size = Object.values(data.users).reduce((total, cur) => total + cur.length, 0)

    LISTS.push(data)
    markConfigChanged()
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
        Object.values(USERS[plat]).forEach(onList => {
            onList.splice(onList.indexOf(listRef), 1)
        })
    }

    markConfigChanged()
    // chrome.storage.local.set({"lists": LISTS})
    console.debug("Deleted list:", listRef.name)
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
    console.log("List fetched")
    return data
}
