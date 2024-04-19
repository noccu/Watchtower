// Globals: this file uses HTML ID vars
//todo: perhaps use messaging?
import {downLoadList} from "../lists.js"
import {CONFIG_DEFAULT} from "../constants.js"
var DBG_LAST_LIST_DL
var TOTAL_SUBS = 0


function fetchNewList(ev) {
    if (ev.key != "Enter" || !ev.target.checkValidity()) return
    // ev.preventDefault()
    downLoadList(ev.target.value).then(uiAddList)
}

function loadOptions(savedCfg) {
    dbgLog(savedCfg)
    savedCfg.lists.forEach(l => {
        uiAddList(l)
    });
};


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
document.addEventListener('DOMContentLoaded', () => chrome.storage.local.get(CONFIG_DEFAULT, loadOptions))
SAVE.addEventListener('click', saveOptions)

//todo: other stuff, organize
const saveOptions = () => {
    console.log("Saving config")
    setStatus("Settings saved")
    // send update event
    return  
    chrome.storage.local.set(
      { lists: [] },
      () => {
      }
    );
  };
  