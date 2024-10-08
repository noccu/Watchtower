import { loadConfig, saveConfig } from "./config.js"
import { loadLists, lookupUser, getPlatformList, addList, removeList, getReportableLists, getLists, checkListUpdates, updateList, exportList } from "./lists.js"
import { reportTargets } from "./constants.js"
import { startReport, REPORT_PAGE_READY, finishReport } from "./report.js"

// Messaging //

function respond(msg, answer) {
    switch (msg.action) {
        case "get-list":
            answer(getPlatformList(msg.platform))
            break
        case "check-user":
            console.debug("User lookup requested:", msg.platform, msg.user) //! dbg
            answer(lookupUser(msg.platform, msg.user))
            break
        case "add-list":
            addList(msg.uri).then(answer)
            break
        case "upd-list":
            updateList(msg.uid).then(answer)
            break
        case "export-list":
            answer(exportList(msg.uid, msg.options))
            break
        case "del-list":
            removeList(msg.uid)
            answer()
            break
        case "get-cfg":
            loadConfig().then(cfg => {
                answer({
                    settings: cfg.settings,
                    lists: getLists()
                })
            })
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
            answer() // Quiet msg conn error due to async reply
            break
        case "send-report":
            finishReport(msg)
            answer()
            break
            //todo: Actually report
    }
}

// Load //

const READY = loadConfig().then(async cfg => {
    await checkListUpdates()
    loadLists(cfg.lists)
})

//todo: Use promises/async once Chrome supports it for extension messaging.
//todo: alternatively, just use a basic keep-alive.
chrome.runtime.onMessage.addListener((msg, _sender, answer) => {
    console.debug("Received:", msg)
    READY.then(() => respond(msg, answer))
    // Expect async answer
    return true
})

chrome.contextMenus.onClicked.addListener(startReport)

// Install //

chrome.runtime.onInstalled.addListener((ev) => {
    if(!["install", "update"].includes(ev.reason)) return
    chrome.contextMenus.create(
        {
            id: "wt-report",
            title: "Watchtower report…",
            contexts: ["link"],
            targetUrlPatterns: reportTargets
        }
    )
})
