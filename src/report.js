import { getListBySource, lookupUser } from "./lists.js"
import { markConfigChanged, saveConfig } from "./config.js"

const POPUP_PATH = "src/action/report.html"
export var REPORT_PAGE_READY

/** Called on context menu report click
 * @param {chrome.contextMenus.OnClickData} data */
export async function reportUser(data, tab) {
    if (data.menuItemId != "wt-report") return
    let csUser = await getReportData(tab, data.linkUrl)
    let user = lookupUser(csUser)
    let reportUser = {...csUser, platform: user.platform }
    console.debug("Reporting user:", reportUser, data)
    openReportDetails(tab, reportUser)
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
 * @param {chrome.tabs.Tab} tab
 * @param {ReportUser} user
*/
async function openReportDetails(tab, user) {
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

/** @param {{options: ReportOptions, user: CSUser, list: SerializedList}} */
export function finishReport({options, user, list}) {
    if (!options.appeal) {
        let reportAdded = getListBySource(list.local.source).addReport(user)
        if (reportAdded) {
            markConfigChanged()
            saveConfig("lists")
        }
    }
    if (options.localOnly) return
    //todo: Send data
}
