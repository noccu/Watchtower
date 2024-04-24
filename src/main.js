import { loadConfig, saveConfig } from "./config.js"
import { loadLists, lookupUser, getPlatformList, saveNewList, deleteList, getReportableLists } from "./lists.js"
import { reportTargets } from "./constants.js"
import { reportUser, REPORT_PAGE_READY } from "./report.js"

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
    else if (msg == "get-report-lists") {
        answer(getReportableLists())
    }
    // Don't ask
    else if (msg == "report-page-loaded") {
        REPORT_PAGE_READY.resolve()
    }
}

// Management
const READY = loadConfig().then(cfg => loadLists(cfg.lists))

chrome.contextMenus.create({
    id: "wt-report",
    title: "Watchtower report…",
    contexts: ["link"],
    targetUrlPatterns: reportTargets
})
chrome.contextMenus.onClicked.addListener(reportUser)
