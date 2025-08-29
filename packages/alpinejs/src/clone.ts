import { effect, release, overrideEffect } from "./reactivity"
import { initTree, isRoot } from "./lifecycle"
import { walk } from "./utils/walk"

export let isCloning: boolean = false

export function skipDuringClone(callback: any, fallback: any = () => {}) {
    return (...args: any[]) => isCloning ? fallback(...args) : callback(...args)
}

export function onlyDuringClone(callback: any) {
    return (...args: any[]) => isCloning && callback(...args)
}

let interceptors: any[] = []

export function interceptClone(callback: any) {
    interceptors.push(callback)
}

export function cloneNode(from: any, to: any)
{
    interceptors.forEach(i => i(from, to))

    isCloning = true

    // We don't need reactive effects in the new tree.
    // Cloning is just used to seed new server HTML with
    // Alpine before "morphing" it onto live Alpine...
    dontRegisterReactiveSideEffects(() => {
        initTree(to, (el: any, callback: any) => {
            // We're hijacking the "walker" so that we
            // only initialize the element we're cloning...
            callback(el, () => {})
        })
    })

    isCloning = false
}

export let isCloningLegacy: boolean = false

/** deprecated */
export function clone(oldEl: any, newEl: any) {
    if (! newEl._data_dataStack) newEl._data_dataStack = oldEl._data_dataStack

    isCloning = true
    isCloningLegacy = true

    dontRegisterReactiveSideEffects(() => {
        cloneTree(newEl)
    })

    isCloning = false
    isCloningLegacy = false
}

/** deprecated */
export function cloneTree(el: any) {
    let hasRunThroughFirstEl = false

    let shallowWalker = (el: any, callback: any) => {
        walk(el, (el: any, skip: any) => {
            if (hasRunThroughFirstEl && isRoot(el)) return skip()

            hasRunThroughFirstEl = true

            callback(el, skip)
        })
    }

    initTree(el, shallowWalker)
}

function dontRegisterReactiveSideEffects(callback: any) {
    let cache = effect

    overrideEffect((callback: any, el: any) => {
        let storedEffect = cache(callback)

        release(storedEffect)

        return () => {}
    })

    callback()

    overrideEffect(cache)
}
