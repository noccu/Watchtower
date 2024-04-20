const PATTERN = new RegExp("/(UserByScreenName|UserTweets)\\?")

var BAD_LABEL = "Test"
var BAD_DESC = "This user is a test subject"


const LABEL = document.createElement("span")
LABEL.className = "profile-label"
const MESSAGE = document.createElement("div")
MESSAGE.className = "profile-mark-msg"

class RequestType {
    constructor(endpoint) {
        this.endpoint = endpoint
    }
    // UserByScreenName -> Profile page only (does not fire on hover)
    isProfile() {
        return this.endpoint.endsWith("e") ? true : false
    }
    // UserTweets
    isTweetList() {
        return this.endpoint.endsWith("s") ? true : false
    }
}


/** @param {CustomEvent} ev */
async function parseResponse(ev) {
    let m = ev.detail.url.match(PATTERN)
    if (!m) return

    let reqType = new RequestType(m[1])
    let resp = JSON.parse(ev.detail.data)
    //? Set a global state?
    if (reqType.isProfile()) {
        if (resp.data.user.result.rest_id.endsWith("2")) {
            markProfile()
        }
    }
    else if (reqType.isTweetList()) {
        //todo: go through tweets to mark or hide them

    }
    console.debug(`Response for: ${reqType}`)
    console.debug(`Response Body: ${resp}`)
    
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
