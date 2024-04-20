/** Monkey patch XHR requests */
function captureXhr() {
    let old = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function () {
        this.addEventListener("load", relay);
        return old.apply(this, arguments);
    };
}

function relay() {
    globalThis.dispatchEvent(new CustomEvent(
        "wt-xhr",
        {detail: {
                url: this.responseURL,
                data: this.responseText
        }}
    ))
}

captureXhr()
