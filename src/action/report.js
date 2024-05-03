/** @type {HTMLSelectElement} */
const LIST_CHOICE = document.getElementById("lists")
/** @type {CSUser} */
var CUR_REPORT

async function loadReportableLists() {
    /** @type {LoadedList[]} */
    let lists = await chrome.runtime.sendMessage({action: "get-report-lists"})
    for (let list of lists) {
        let option = document.createElement("option")
        option.text = list.meta.name
        option.value = list.meta.source
        option.list = list
        LIST_CHOICE.add(option)
    }
}

/** @param {CSUser} data */
function updateReportData(data) {
    CUR_REPORT = data
    document.getElementById("user-platform").textContent = data.platform
    document.getElementById("user-name").textContent = data.user.name
    document.getElementById("user-data").textContent = JSON.stringify(data.user, null, 2)
}

function swListener(msg, sender, answer) {
    if (msg.action == "set-report") {
        updateReportData(msg.user)
    }
}

function report() {
    if (LIST_CHOICE.selectedIndex == -1) return
    /** @type {LoadedList} */
    let selectedList = LIST_CHOICE.options[LIST_CHOICE.selectedIndex].list
    console.debug(`Reporting ${CUR_REPORT.platform} user ${CUR_REPORT.user.name} to ${selectedList.meta.name} through ${selectedList.meta.reportTarget}`)
}

function onLoad() {
    loadReportableLists()
    document.getElementById("report").addEventListener("click", report)
    chrome.runtime.onMessage.addListener(swListener)
    chrome.runtime.sendMessage({action: "report-page-loaded"})
}

document.addEventListener("DOMContentLoaded", onLoad)
console.debug("Popup loaded")
