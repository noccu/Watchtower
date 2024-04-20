import { loadOptions } from "./options/options.js"
import { loadLists, lookupUser, getPlatformList, saveNewList } from "./lists.js"

// Management
const CONFIG = loadOptions()
// User other options here
loadLists(CONFIG.lists)
console.debug(CONFIG)

// Messaging
chrome.runtime.onMessage.addListener((msg, sender, answer) => {
    if (msg.action == "get-list") {
        answer(getPlatformList(msg.platform))
    }
    else if (msg.action == "check-user") {
        console.debug("User lookup requested:", msg.platform, msg.id) //! dbg
        answer(lookupUser(msg.platform, msg.id))
    }
    else if (msg.action == "add-list") {
        console.debug("Add new list requested")
        saveNewList(msg.url).then(answer)
    }
    // Expect async answer
    return true
})

// UI???
