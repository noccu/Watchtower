// Globals: this file uses HTML ID vars
var DBG_LAST_LIST_DL
const DBG = true
var TOTAL_SUBS = 0
// The extension's default options
var CONFIG_DEFAULT = {
    lists: []
}


function dbgLog(msg) {
    if (!DBG) return
    console.log(msg)
}

function fetchNewList(ev) {
    dbgLog(ev) //!dbg
    if (!ev.target.checkValidity()) dbgLog("invalid")
    if (ev.key != "Enter" || !ev.target.checkValidity()) return
    // ev.preventDefault()
    downLoadList(ev.target.value)
}

async function downLoadList(url) {
    console.log(`Fetching new list: ${url}`)
    let data = await fetch(url).then(x => x.json())
    console.log("List fetched")
    data["source"] = url
    uiAddList(data)
    DBG_LAST_LIST_DL = data
    //save internally
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
    T_SUB.content.querySelector(".sub-num").textContent = data.list.length
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
  