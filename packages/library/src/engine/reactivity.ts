import { scheduler } from './scheduler'

let reactive: any, effect: any, release: any, raw: any

let shouldSchedule = true
export function disableEffectScheduling(callback: any) {
    shouldSchedule = false

    callback()

    shouldSchedule = true
}

export function setReactivityEngine(engine: any) {
    reactive = engine.reactive
    release = engine.release
    effect = (callback: any) => engine.effect(callback, { scheduler: (task: any) => {
        if (shouldSchedule) {
            scheduler(task)
        } else {
            task()
        }
    } })
    raw = engine.raw
}

export function overrideEffect(override: any) { effect = override }

export function elementBoundEffect(el: any) {
    let cleanup = () => {}

    let wrappedEffect = (callback: any) => {
        let effectReference = effect(callback)

        if (! el._data_effects) {
            el._data_effects = new Set

            // Livewire depends on el._data_runEffects.
            el._data_runEffects = () => { el._data_effects.forEach((i: any) => i()) }
        }

        el._data_effects.add(effectReference)

        cleanup = () => {
            if (effectReference === undefined) return

            el._data_effects.delete(effectReference)

            release(effectReference)
        }

        return effectReference
    }

    return [wrappedEffect, () => { cleanup() }]
}

export function watch(getter: any, callback: any) {
    let firstTime = true

    let oldValue: any

    let effectReference = effect(() => {
        let value = getter()

        // JSON.stringify touches every single property at any level enabling deep watching
        JSON.stringify(value)

        if (! firstTime) {
            // We have to queue this watcher as a microtask so that
            // the watcher doesn't pick up its own dependencies.
            queueMicrotask(() => {
                callback(value, oldValue)

                oldValue = value
            })
        } else {
            oldValue = value
        }

        firstTime = false
    })

    return () => release(effectReference)
}

export {
    release,
    reactive,
    effect,
    raw,
}