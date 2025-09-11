import { attributesOnly, directives } from './directives'

let binds: Record<string, any> = {}

export function bind(name: any, bindings: any) {
    let getBindings = typeof bindings !== 'function' ? () => bindings : bindings

    if (name instanceof Element) {
        return applyBindingsObject(name, getBindings())
    } else {
        binds[name] = getBindings
    }

    return () => {} // Null cleanup...
}

export function injectBindingProviders(obj: any) {
    Object.entries(binds).forEach(([name, callback]) => {
        Object.defineProperty(obj, name, {
            get() {
                return (...args: any[]) => {
                    return callback(...args)
                }
            }
        })
    })

    return obj
}

export function addVirtualBindings(el: any, bindings: any) {
    let getBindings = typeof bindings !== 'function' ? () => bindings : bindings

    el._data_virtualDirectives = getBindings()
}

export function applyBindingsObject(el: any, obj: any, original?: any) {
    let cleanupRunners: any[] = []

    while (cleanupRunners.length) cleanupRunners.pop()()

    let attributes = Object.entries(obj).map(([name, value]) => ({ name, value }))

    let staticAttributes = attributesOnly(attributes)

    // Handle binding normal HTML attributes (non-Nexus-UX directives).
    attributes = attributes.map(attribute => {
        if (staticAttributes.find(attr => attr.name === attribute.name)) {
            return {
                name: `data-bind:${attribute.name}`,
                value: `"${attribute.value}"`,
            }
        }

        return attribute
    })

    directives(el, attributes, original).map((handle: any) => {
        cleanupRunners.push(handle.runCleanups)

        handle()
    })

    return () => {
        while (cleanupRunners.length) cleanupRunners.pop()()
    }
}
