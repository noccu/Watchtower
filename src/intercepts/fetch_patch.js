/** Monkey patch fetch requests */
function captureFetch() {
    let old = window.fetch
    window.fetch = function (_url, opts) {
        let resp = old.apply(this, arguments)
        resp.then(data => relay(data, opts?.body))
        return resp
    }
}

async function relay(resp, payload) {
    if (!resp.ok) return
    // Fetch streams only read once.
    let data = await resp.clone().json()
    globalThis.dispatchEvent(new CustomEvent(
        "wt-fetch",
        {detail: {
            url: resp.url,
            data,
            payload
        }}
    ))
}

captureFetch()
