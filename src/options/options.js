import { DEFAULT_LIST_EXPORT_OPTIONS } from "../constants.js"
import { deserializeOptions, serializeOptions } from "../utils.js"

var TOTAL_SUBS = 0
var CUR_EXPORT

// UI background
function fetchNewList(ev) {
    if (ev.key != "Enter" || !ev.target.checkValidity()) return
    let uri = ev.target.value
    if (!uri.startsWith("http")) {
        uri = `file://${uri}`
    }
    chrome.runtime.sendMessage({
        action: "add-list",
        uri
    }).then(data => {
        if (!data) return
        // Really dislike JS type handling
        if (typeof data == "string") {
            ev.target.value = data
            return
        }
        uiAddList(data)
        ev.target.value = ""
    })
}

/** @param {MouseEvent} ev */
function onListAction(ev) {
    if (!ev.target.parentElement.list) return
    switch (ev.target.name) {
        case "upd":
            updateList(ev.target.parentElement)
            break
        case "export":
            showExportDialog(ev)
            break
        case "del":
            deleteList(ev.target.parentElement)
            break
    }
}

/** @param {MouseEvent} ev */
function showExportDialog(ev) {
    let dialog = getId("export-options")
    dialog.invoker = ev.target.parentElement
    /** @type {SerializedList} */
    let list = dialog.invoker.list
    deserializeOptions(list.local.exportOptions || DEFAULT_LIST_EXPORT_OPTIONS, dialog)
    dialog.style.left = `${ev.clientX}px`
    dialog.style.top = `${ev.clientY}px`
    dialog.showPopover()
}

function deleteList(subEle) {
    chrome.runtime.sendMessage({
        action: "del-list",
        uid: subEle.list.local.source
    }).then(isDeleted => {
        if (!isDeleted) return
        subEle.remove()
        TOTAL_SUBS -= 1
        getId("subLen").textContent = TOTAL_SUBS
    })
}

function updateList(subEle) {
    chrome.runtime.sendMessage({
        action: "upd-list",
        uid: subEle.list.local.source
    }).then(updatedData => {
        if (!updatedData) return
        uiSetListData(subEle, updatedData)
    })
}

async function exportList(_ev) {
    const dialog = getId("export-options")
    /** @type {LocalListData["exportOptions"]} */
    const options = serializeOptions(dialog.querySelectorAll(".option"))
    // Update local page cache
    dialog.invoker.list.local.exportOptions = options
    /** @type {{localData: LocalListData, exportedList: List}} */
    const { localData, exportedList } = await chrome.runtime.sendMessage({
        action: "export-list",
        uid: dialog.invoker.list.local.source,
        options
    })
    let filename = localData.source.split(/[/\\]/).at(-1)
    if (!filename.endsWith(".json")) {
        filename = `${exportedList.meta.name.toLowerCase().replace(" ", "_")}.json"`
    }
    let file = new File(
        [JSON.stringify(exportedList, null, 2)],
        filename,
        { type: "application/json" }
    )
    CUR_EXPORT = URL.createObjectURL(file)
    // Would like to use last used dir as default save, but imagine extension APIs being useful!
    chrome.downloads.download({
        url: CUR_EXPORT,
        filename,
        saveAs: true
    })
    dialog.hidePopover()
}

/** @param {chrome.downloads.DownloadDelta} data */
function exportDone(data) {
    if (data.state?.current != "complete") return
    URL.revokeObjectURL(CUR_EXPORT)
}

/**
 * @param {HTMLElement} ele
 * @param {SerializedList} data
 */
function uiSetListData(ele, data) {
    ele.querySelector(".sub-name").textContent = data.meta.name
    ele.querySelector(".sub-url").href = data.meta.homepage || data.local.source
    ele.querySelector(".sub-num span").textContent = data.local.size
    ele.list = data
}

/** @param {SerializedList} data */
function uiAddList(data) {
    let t_sub = getId("t_sub").content.cloneNode(true)
    uiSetListData(t_sub.firstElementChild, data)
    getId("subList").append(t_sub)
    TOTAL_SUBS += 1
    getId("subLen").textContent = TOTAL_SUBS
}

function saveCfg() {
    chrome.runtime.sendMessage({ action: "save-cfg" })
}

// -> <-
function getId(id) {
    return document.getElementById(id)
}


// UI User actions
function onOptionsOpened() {
    getId("subscriptions").addEventListener("click", onListAction)
    getId("new-list").addEventListener("keyup", fetchNewList)
    getId("export-list").addEventListener("click", exportList)
    chrome.downloads.onChanged.addListener(exportDone)
    chrome.runtime.sendMessage({ action: "get-cfg" }).then(cfg => {
        //todo: move to actual func to set up complex ui/options
        cfg.lists.forEach(uiAddList)
    })
    window.addEventListener("blur", saveCfg)
}

// Called from options page
if (globalThis.document) onOptionsOpened()
