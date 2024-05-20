// Enable bypassing context menu overwrites with shift key.
// Default in Firefox, which doesn't fire the event.
function captureContextEvents() {
    let old = EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function (type, _cb, _opts) {
        if (type == "contextmenu") {
            old.call(
                this,
                type,
                e => { if (e.shiftKey) e.stopPropagation() },
                true
            )
        }
        return old.apply(this, arguments)
    }
}

captureContextEvents()
