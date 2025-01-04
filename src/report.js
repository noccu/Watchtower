import { getListBySource, indexSingleUser, lookupUser } from "./lists.js"
import { saveConfig } from "./config.js"

const POPUP_PATH = "src/action/report.html"
export var REPORT_PAGE_READY

/** Called on context menu report click
 * @param {chrome.contextMenus.OnClickData} data */
export async function startReport(data, tab) {
    if (data.menuItemId != "wt-report") return
    let { platform, ...user } = await getReportData(tab, data.linkUrl)
    let onLists = lookupUser(platform, user)?.onLists
    let rUser = { user, platform, onLists }
    console.debug("Reporting user:", rUser, data)
    openReportDetails(tab, rUser)
}

/**
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<CSUser>} */
function getReportData(tab, targetLink) {
    return chrome.tabs.sendMessage(
        tab.id,
        {
            action: "get-user",
            targetLink
        })
}

/**
 * @param {chrome.tabs.Tab} _tab
 * @param {ReportUser} user
*/
async function openReportDetails(_tab, user) {
    // Because there's no way to wait until the page is fully loaded, apparently! Whee, hacks!
    REPORT_PAGE_READY = Promise.withResolvers()
    // Not available in Chrome in most normal cases. It's been years.
    if (chrome.action.openPopup) {
        chrome.action.setPopup({ popup: POPUP_PATH })
        await chrome.action.openPopup()
    }
    else {
        await chrome.windows.create({
            type: "popup",
            focused: true,
            url: POPUP_PATH,
            width: 360,
            height: 325
        })
    }
    await REPORT_PAGE_READY.promise
    chrome.runtime.sendMessage({
        action: "set-report",
        user
    })
}

/** @param {{options: ReportOptions, userData: ReportUser, list: SerializedList}} */
export function finishReport({ options, userData, list }) {
    if (!options.appeal) {
        let targetList = getListBySource(list.local.source)
        let loadedUser = indexSingleUser(userData.platform, userData.user)
        if (loadedUser.isOnList(targetList)) return
        let reportAdded = targetList.addReport(userData.platform, loadedUser)
        if (reportAdded) {
            saveConfig("lists")
        }
    }
    // if (options.localOnly) return
    //todo: Send data
}
