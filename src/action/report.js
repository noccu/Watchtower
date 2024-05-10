import { serializeOptions } from "../utils.js"

/** @type {HTMLSelectElement} */
const LIST_CHOICE = document.getElementById("lists")
/** @type {CSUser} */
var CUR_REPORT

async function loadReportableLists() {
    /** @type {SerializedList[]} */
    let lists = await chrome.runtime.sendMessage({ action: "get-report-lists" })
    for (let list of lists) {
        let option = document.createElement("option")
        option.text = list.meta.name
        option.list = list
        LIST_CHOICE.add(option)
    }
}

/** @param {ReportUser} userData */
function updateReportData(userData) {
    CUR_REPORT = userData
    document.getElementById("user-platform").textContent = userData.platform
    document.getElementById("user-name").textContent = userData.user.name
    document.getElementById("user-data").textContent = JSON.stringify(userData.user, null, 2)
    // sizeToFit()
}

function swListener(msg, _sender, _answer) {
    if (msg.action == "set-report") {
        updateReportData(msg.user)
    }
}

function report() {
    if (LIST_CHOICE.selectedIndex == -1) return
    /** @type {SerializedList} */
    let selectedList = LIST_CHOICE.options[LIST_CHOICE.selectedIndex].list
    let options = serializeOptions(document.querySelectorAll(".option"))
    console.debug(`Reporting ${CUR_REPORT.platform} user ${CUR_REPORT.name} to ${selectedList.meta.name} through ${selectedList.meta.reportTarget}`)
    chrome.runtime.sendMessage({
        action: "send-report",
        options,
        userData: CUR_REPORT,
        list: selectedList
    })
}

// function sizeToFit() {
//     let xdelta = window.outerWidth - window.innerWidth
//     let ydelta = window.outerHeight - window.innerHeight
//     window.resizeTo(
//         document.documentElement.offsetWidth + xdelta,
//         document.documentElement.offsetHeight + ydelta
//     )
// }

function onLoad() {
    loadReportableLists()
    document.getElementById("report").addEventListener("click", report)
    chrome.runtime.onMessage.addListener(swListener)
    chrome.runtime.sendMessage({ action: "report-page-loaded" })
}

document.addEventListener("DOMContentLoaded", onLoad)
console.debug("Popup loaded")
