import { loadConfig, saveConfig } from "./config.js"
import { loadLists, lookupUser, getPlatformList, saveNewList, deleteList } from "./lists.js"

// Messaging
//todo: Use promises/async once Chrome supports it for extension messaging.
//todo: alternatively, just use a basic keep-alive.
chrome.runtime.onMessage.addListener((msg, sender, answer) => {
    console.debug("Received:", msg)
    READY.then(() => respond(msg, answer))
    // Expect async answer
    return true
})

function respond(msg, answer) {
    if (msg.action == "get-list") {
        answer(getPlatformList(msg.platform))
    }
    else if (msg.action == "check-user") {
        console.debug("User lookup requested:", msg.platform, msg.id) //! dbg
        answer(lookupUser(msg.platform, msg.id))
    }
    else if (msg.action == "add-list") {
        saveNewList(msg.url).then(answer)
    }
    else if (msg.action == "del-list") {
        deleteList(msg.uid).then(answer)
    }
    else if (msg == "get-cfg") {
        loadConfig().then(answer)
    }
    else if (msg == "save-cfg") {
        answer(saveConfig())
    }
}

// Management
const READY = loadConfig().then(cfg => loadLists(cfg.lists))
