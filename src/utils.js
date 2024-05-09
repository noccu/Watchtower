/** @param {Iterable<HTMLInputElement>} options */
export function serializeOptions(options) {
    const result = {}
    for (var opt of options) {
        if (opt.type == "checkbox") {
            result[opt.name] = opt.checked
        }
        // Split more types as required
        else {
            result[opt.name] = opt.value
        }
    }
    return result
}

/** @param {HTMLElement} parentElement */
export function deserializeOptions(options, parentElement) {
    var ele
    for (var [key, value] of Object.entries(options)) {
        ele = parentElement.querySelector(`[name='${key}']`)
        if (ele.type == "checkbox") {
            ele.checked = value
        }
        else {
            ele.value = value
        }
    }
}
