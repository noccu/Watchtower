var TOTAL_SUBS = 0

// UI background
function fetchNewList(ev) {
    if (ev.key != "Enter" || !ev.target.checkValidity()) return
    // ev.preventDefault()
    chrome.runtime.sendMessage({
        action: "add-list",
        url: ev.target.value
    }).then(data => {
        if (!data) return
        uiAddList(data)
        ev.target.value = ""
    })
}

/** @param {MouseEvent} ev */
function deleteList(ev) {
    if (!ev.target.uid) return
    chrome.runtime.sendMessage({
        action: "del-list",
        uid: ev.target.uid
    }).then(isDeleted => {
        if (!isDeleted) return
        ev.target.parentElement.remove()
        TOTAL_SUBS -= 1
        getId("subLen").textContent = TOTAL_SUBS
    })
}

/** @param {List} data */
function uiAddList(data) {
    let t_sub = getId("t_sub").content.cloneNode(true)
    t_sub.querySelector(".sub-name").textContent = data.name
    t_sub.querySelector(".sub-url").href = data.homepage
    t_sub.querySelector(".sub-num").textContent = data.size
    t_sub.querySelector(".sub-del").uid = data.source
    getId("subList").append(t_sub)
    TOTAL_SUBS += 1
    getId("subLen").textContent = TOTAL_SUBS
}

function saveCfg() {
    chrome.runtime.sendMessage("save-cfg")
}

// -> <-
function getId(id) {
    return document.getElementById(id)
}


// UI User actions
function onOptionsOpened() {
    getId("subscriptions").addEventListener("click", deleteList)
    getId("newList").addEventListener("keyup", fetchNewList)
    // getId("save").addEventListener('click', saveOptions)
    chrome.runtime.sendMessage("get-cfg").then(cfg => {
        //todo: move to actual func to set up complex ui/options
        cfg.lists.forEach(uiAddList)
    })
    window.addEventListener("blur", saveCfg)
}

// Called from options page
if (globalThis.document) onOptionsOpened()
