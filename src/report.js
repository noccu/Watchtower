const POPUP_PATH = "src/action/report.html"
export var REPORT_PAGE_READY

/** @param {chrome.contextMenus.OnClickData} data */
export async function reportUser(data, tab) {
    if (data.menuItemId != "wt-report") return
    let user = await getReportData(tab, data.linkUrl)
    console.debug("Reporting user:", user, data)
    confirmReport(tab, user)
}

/** @param {chrome.tabs.Tab} tab */
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
 * @param {User} user
*/
async function confirmReport(tab, user) {
    chrome.action.setPopup({ popup: POPUP_PATH })
    // Not available in Chrome in most normal cases. It's been years.
    if (chrome.action.openPopup) {
        await chrome.action.openPopup()
    }
    else {
        await chrome.windows.create({
            type: "popup",
            focused: true,
            url: POPUP_PATH,
            width: 300,
            height: 300
        })
    }
    // Because there's no way to wait until the page is fully loaded, apparently! Whee, hacks!
    REPORT_PAGE_READY = Promise.withResolvers()
    await REPORT_PAGE_READY.promise
    chrome.runtime.sendMessage({
        action: "set-report",
        user
    })
}