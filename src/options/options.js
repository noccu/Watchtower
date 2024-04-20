//todo: perhaps use messaging?
import {CONFIG_DEFAULT} from "../constants.js"
var DBG_LAST_LIST_DL
var TOTAL_SUBS = 0


export async function loadOptions() {
    let savedCfg = await chrome.storage.local.get(CONFIG_DEFAULT)
    console.debug("Config loaded:", savedCfg)
    return savedCfg
    // savedCfg.lists.forEach(uiAddList);
};

export function saveOptions (cfg) {
    console.log("Saving config")
    // fullCfg = structuredClone(CONFIG_DEFAULT)
    // Object.assign(fullCfg, cfg)
    chrome.storage.local.set(cfg);
    //todo: send update event
    console.log("Config saved")
    setStatus("Config saved")
  };


// UI background
function fetchNewList(ev) {
    if (ev.key != "Enter" || !ev.target.checkValidity()) return
    // ev.preventDefault()
    chrome.runtime.sendMessage({
        action: "add-list",
        url: ev.target.value
    }).then(uiAddList)
}

/** @param {MouseEvent} ev */
function deleteList(ev) {
    if (!ev.target.uid) return
    chrome.runtime.sendMessage({
        action: "del-list",
        uid: ev.target.uid
    }).then(isDeleted => {
        if (isDeleted) ev.target.parentElement.remove()
    })
}

/** @param {List} data */
function uiAddList(data) {
    DBG_LAST_LIST_DL = data //!dbg
    let t_sub = getId("t_sub").content.cloneNode(true)
    t_sub.querySelector(".sub-name").textContent = data.name
    t_sub.querySelector(".sub-url").href = data.homepage
    t_sub.querySelector(".sub-num").textContent = data.size
    t_sub.querySelector(".sub-del").uid = data.source
    getId("subList").append(t_sub)
    TOTAL_SUBS += 1
    getId("subLen").textContent = TOTAL_SUBS
}

//todo: improve error display in UI
function setStatus(msg) {
    let status = getId("status")
    status.textContent = msg
    setTimeout(() => status.textContent = "", 1500)
}

// -> <-
function getId(id) {
    return document.getElementById(id)
}


// UI User actions
function onOptionsOpened() {
    getId("subscriptions").addEventListener("click", deleteList)
    getId("newList").addEventListener("keyup", fetchNewList)
    getId("save").addEventListener('click', saveOptions)
    // document.addEventListener('DOMContentLoaded', () => chrome.storage.local.get(CONFIG_DEFAULT, loadOptions))
    loadOptions().then(cfg => cfg.lists.forEach(uiAddList))
}

if (globalThis.document) onOptionsOpened()
