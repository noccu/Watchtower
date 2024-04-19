export var DBG = true
// Map supported platforms to main key
export const PLATFORMS = {
    "twitter": "rest_id",
    "pixiv": "id"
}

// The extension's default options
export const CONFIG_DEFAULT = {
    lists: []
}

/**
 * A platform user part of a list.
 * @typedef {Object} User
 * @property {string} user - Platform username/handle. Required.
 * @property {string} id - Platform ID of the user, generally used as main key.
 * @property {List[]} [onLists] - Present when cached, contains refs to lists the user is on.
 */

/**
 * A list following a specific theme. Only main properties listed.
 * @typedef {Object} List
 * @property {string} name - List name.
 * @property {string} label - The label to display on posts.
 * @property {string} msg - The message to display on profiles0
 * @property {string} color - The color to use for list UI elements.
 * @property {string} homepage - The main/support page of the list.
 * @property {string} source - Download/update URL of the list.
 * @property {Object.<string, User[]>} users - Users on the list, split by platform (key).
 */
