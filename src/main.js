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
    switch (msg.action) {
        case "get-list":
            answer(getPlatformList(msg.platform))
            break
        case "check-user":
            console.debug("User lookup requested:", msg.platform, msg.id) //! dbg
            answer(lookupUser(msg.platform, msg.id))
            break
        case "add-list":
            saveNewList(msg.url).then(answer)
            break
        case "del-list":
            deleteList(msg.uid).then(answer)
            break
        case "get-cfg":
            loadConfig().then(answer)
            break
        case "save-cfg":
            answer(saveConfig())
            break
        case "get-report-lists":
            answer(getReportableLists())
            break
        // Don't ask
        case "report-page-loaded":
            REPORT_PAGE_READY.resolve()
            break
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
