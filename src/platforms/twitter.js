const PATTERN = new RegExp("/(UserByScreenName|UserTweets)\\?")

var BAD_LABEL = "Test"
var BAD_DESC = "This user is a test subject"


const LABEL = document.createElement("span")
LABEL.className = "profile-label"
const MESSAGE = document.createElement("div")
MESSAGE.className = "profile-mark-msg"


/** @param {CustomEvent} ev */
async function parseResponse(ev) {
    let m = ev.detail.url.match(PATTERN)
    if (!m) return

    let reqType = m[1]
    let resp = JSON.parse(ev.detail.data)
    // UserByScreenName
    if (reqType.endsWith("e")) {
        if (resp.data.user.result.rest_id.endsWith("2")) {
            markProfile()
        }
    }
    // UserTweets
    else if (reqType.endsWith("s")) {
        //todo: go through tweets to mark or hide them

    }
    console.log(`Response for: ${reqType}`);
    console.log(`Response Body: ${resp}`);
    
}

function markProfile() {
    msgCopy = MESSAGE.cloneNode()
    msgCopy.textContent = `${BAD_LABEL}\n${BAD_DESC}`
    document.querySelector("[data-testid='UserName']")
    .append(msgCopy)
}

function onLoad() {
    globalThis.addEventListener("wt-xhr", parseResponse)
}

console.log("actually running")
//captureXhr()
