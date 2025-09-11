export function walk(el: any, callback: (el: any, skip: () => void) => void) {
    if (typeof ShadowRoot === 'function' && el instanceof ShadowRoot) {
        Array.from(el.children).forEach((el: any) => walk(el, callback))

        return
    }

    let skip = false

    callback(el, () => skip = true)

    if (skip) return

    let node = el.firstElementChild

    while (node) {
        walk(node, callback)

        node = node.nextElementSibling
    }
}
