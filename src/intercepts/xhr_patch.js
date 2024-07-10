/** Monkey patch XHR requests */
const SUPPORTED_TYPES = ["", "text", "json"]
function captureXhr() {
    let old = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function () {
        this.addEventListener("load", relay);
        return old.apply(this, arguments);
    };
}

function relay() {
    if (!SUPPORTED_TYPES.includes(this.responseType)) {
        return
    }
    globalThis.dispatchEvent(new CustomEvent(
        "wt-xhr",
        {detail: {
                url: this.responseURL,
                data: this.responseText
        }}
    ))
}

captureXhr()
