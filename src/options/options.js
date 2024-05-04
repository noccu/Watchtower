var TOTAL_SUBS = 0

// UI background
function fetchNewList(ev) {
    if (ev.key != "Enter" || !ev.target.checkValidity()) return
    let location = ev.target.value
    if (!location.startsWith("http")) {
        location = `file://${location}`
    }
    chrome.runtime.sendMessage({
        action: "add-list",
        url: location
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
    if (!ev.target.parentElement.uid) return
    if (ev.target.value == "upd") updateList(ev.target.parentElement)
    else if (ev.target.value == "del") deleteList(ev.target.parentElement)
}

function deleteList(subEle) {
    chrome.runtime.sendMessage({
        action: "del-list",
        uid: subEle.uid
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
        uid: subEle.uid
    }).then(updatedData => {
        if (!updatedData) return
        uiSetListData(subEle, updatedData)
    })
}

/** 
 * @param {HTMLElement} ele 
 * @param {SerializedList} data 
 */
function uiSetListData(ele, data) {
    ele.querySelector(".sub-name").textContent = data.meta.name
    ele.querySelector(".sub-url").href = data.meta.homepage || data.local.source
    ele.querySelector(".sub-num span").textContent = data.local.size
    ele.uid = data.local.source
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
    chrome.runtime.sendMessage({action: "save-cfg"})
}

// -> <-
function getId(id) {
    return document.getElementById(id)
}


// UI User actions
function onOptionsOpened() {
    getId("subscriptions").addEventListener("click", onListAction)
    getId("new-list").addEventListener("keyup", fetchNewList)
    // getId("save").addEventListener('click', saveOptions)
    chrome.runtime.sendMessage({action: "get-cfg"}).then(cfg => {
        //todo: move to actual func to set up complex ui/options
        cfg.lists.forEach(uiAddList)
    })
    window.addEventListener("blur", saveCfg)
}

// Called from options page
if (globalThis.document) onOptionsOpened()
