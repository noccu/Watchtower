const POPUP_PATH = "src/action/report.html"
export var REPORT_PAGE_READY

/** Called on context menu report click
 * @param {chrome.contextMenus.OnClickData} data */
export async function reportUser(data, tab) {
    if (data.menuItemId != "wt-report") return
    let user = await getReportData(tab, data.linkUrl)
    console.debug("Reporting user:", user, data)
    openReportDetails(tab, user)
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
 * @param {CSUser} user
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
            height: 275
        })
    }
    await REPORT_PAGE_READY.promise
    chrome.runtime.sendMessage({
        action: "set-report",
        user
    })
}