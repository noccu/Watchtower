import { loadOptions } from "./options/options.js"
import { loadLists, lookupUser, getPlatformList, downLoadList } from "./lists.js"

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
    else if (msg.action == "dl-list") {
        console.debug("List download requested:", msg.url)
        downLoadList(msg.url).then(answer)
    }
    // Expect async answer
    return true
})

// UI???
