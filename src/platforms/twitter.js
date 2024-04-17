const PATTERN = new RegExp("/(UserByScreenName|UserTweets)\\?")

var BAD_LABEL = "Test"
var BAD_DESC = "This user is a test subject"


const LABEL = document.createElement("span")
LABEL.className = "profile-label"
const MESSAGE = document.createElement("div")
MESSAGE.className = "profile-mark-msg"

function captureXhr() {
    let old = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function () {
        let m = arguments[1].match(PATTERN)
        if (m) {
            this._reqType = m[1]
            this.addEventListener("load", parseResponse);
        }
        return old.apply(this, arguments);
    };
}

function parseResponse() {
    let resp = JSON.parse(this.responseText)
    // UserByScreenName
    if (this._reqType.endsWith("e")) {
        if (resp.data.user.result.rest_id.endsWith("2")) {
            markProfile()
        }
    }
    // UserTweets
    else if (this._reqType.endsWith("s")) {
        //todo: go through tweets to mark or hide them

    }
    console.log(`Response for: ${this._reqType}`);
    console.log(`Response Body: ${resp}`);
    
}

function markProfile() {
    msgCopy = MESSAGE.cloneNode()
    msgCopy.textContent = `${BAD_LABEL}\n${BAD_DESC}`
    document.querySelector("[data-testid='UserName']")
    .append(msgCopy)
}

console.log("actually running")
captureXhr()
