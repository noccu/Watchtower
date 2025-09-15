/** Check if a DOM element is present. Interval and timeout in ms. */
function domExist(selector, interval=500, timeout=15000) {
    /** @type {PromiseWithResolvers<Element>} */
    const p = Promise.withResolvers()
    const iv = setInterval(() => {
        let domObj = document.querySelector(selector)
        if (domObj) {
            clearInterval(iv)
            p.resolve(domObj)
        }
    }, interval)
    setTimeout(() => clearInterval(iv), timeout)
    return p.promise
}