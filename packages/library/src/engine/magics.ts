import { getElementBoundUtilities } from './directives'
import { interceptor } from './interceptor'
import { onElRemoved } from './mutation'

let magics: Record<string, (el?: any, utils?: any) => any> = {}

export function magic(name: string, callback: (el?: any, utils?: any) => any) {
    magics[name] = callback
}

export function injectMagics(obj: any, el: any) {
    let memoizedUtilities = getUtilities(el)

    Object.entries(magics).forEach(([name, callback]) => {
        Object.defineProperty(obj, `$${name}`, {
            get() {
                return callback(el, memoizedUtilities);
            },
            enumerable: false,
        })
    })

    return obj
}

export function getUtilities(el: any) {
    let [utilities, cleanup] = getElementBoundUtilities(el)

    let utils = { interceptor, ...utilities }

    onElRemoved(el, cleanup)

    return utils;
}
