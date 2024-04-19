// Globals: this file uses HTML ID vars
//todo: perhaps use messaging?
import {downLoadList} from "../lists.js"
import {CONFIG_DEFAULT} from "../constants.js"
var DBG_LAST_LIST_DL
var TOTAL_SUBS = 0


export async function loadOptions() {
    let savedCfg = await chrome.storage.local.get(CONFIG_DEFAULT)
    console.debug(savedCfg)
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
    downLoadList(ev.target.value).then(uiAddList)
}


// UI background
function uiAddList(data) {
    T_SUB.content.querySelector(".sub-name").textContent = data.name
    T_SUB.content.querySelector(".sub-url").href = data.homepage
    T_SUB.content.querySelector(".sub-num").textContent = data.size
    SUB_LIST.append(T_SUB.content.cloneNode(true))
    TOTAL_SUBS += 1
    SUB_LEN.textContent = TOTAL_SUBS
}

function setStatus(msg) {
    STATUS.textContent = msg
    setTimeout(() => STATUS.textContent = "", 1500)
}


// UI User actions
newList.addEventListener("keyup", fetchNewList)
// document.addEventListener('DOMContentLoaded', () => chrome.storage.local.get(CONFIG_DEFAULT, loadOptions))
loadOptions().then(cfg => cfg.lists.forEach(uiAddList))
SAVE.addEventListener('click', saveOptions)
