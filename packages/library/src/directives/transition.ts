import { releaseNextTicks, holdNextTicks } from '../engine/nextTick'
import { setClasses } from '../utils/classes'
import { setStyles } from '../utils/styles'
import { directive } from '../engine/directives'
import { mutateDom } from '../engine/mutation'
import { once } from '../utils/once'

directive('transition', (el: any, { value, modifiers, expression }: any, { evaluate }: any) => {
    if (typeof expression === 'function') expression = evaluate(expression)
    if (expression === false) return
    if (!expression || typeof expression === 'boolean') {
        registerTransitionsFromHelper(el, modifiers, value)
    } else {
        registerTransitionsFromClassString(el, expression, value)
    }
})

function registerTransitionsFromClassString(el: any, classString: any, stage: any) {
    registerTransitionObject(el, setClasses, '')

    let directiveStorageMap: any = {
        'enter': (classes: any) => { el._data_transition.enter.during = classes },
        'enter-start': (classes: any) => { el._data_transition.enter.start = classes },
        'enter-end': (classes: any) => { el._data_transition.enter.end = classes },
        'leave': (classes: any) => { el._data_transition.leave.during = classes },
        'leave-start': (classes: any) => { el._data_transition.leave.start = classes },
        'leave-end': (classes: any) => { el._data_transition.leave.end = classes },
    }

    directiveStorageMap[stage](classString)
}

function registerTransitionsFromHelper(el: any, modifiers: any, stage: any) {
    registerTransitionObject(el, setStyles)

    let doesntSpecify = (! modifiers.includes('in') && ! modifiers.includes('out')) && ! stage
    let transitioningIn = doesntSpecify || modifiers.includes('in') || ['enter'].includes(stage)
    let transitioningOut = doesntSpecify || modifiers.includes('out') || ['leave'].includes(stage)

    if (modifiers.includes('in') && ! doesntSpecify) {
        modifiers = modifiers.filter((i: any, index: any) => index < modifiers.indexOf('out'))
    }

    if (modifiers.includes('out') && ! doesntSpecify) {
        modifiers = modifiers.filter((i: any, index: any) => index > modifiers.indexOf('out'))
    }

    let wantsAll = ! modifiers.includes('opacity') && ! modifiers.includes('scale')
    let wantsOpacity = wantsAll || modifiers.includes('opacity')
    let wantsScale = wantsAll || modifiers.includes('scale')
    let opacityValue = wantsOpacity ? 0 : 1
    let scaleValue = wantsScale ? modifierValue(modifiers, 'scale', 95) / 100 : 1
    let delay = modifierValue(modifiers, 'delay', 0) / 1000
    let origin = modifierValue(modifiers, 'origin', 'center')
    let property = 'opacity, transform'
    let durationIn = modifierValue(modifiers, 'duration', 150) / 1000
    let durationOut = modifierValue(modifiers, 'duration', 75) / 1000
    let easing = `cubic-bezier(0.4, 0.0, 0.2, 1)`

    if (transitioningIn) {
        el._data_transition.enter.during = {
            transformOrigin: origin,
            transitionDelay: `${delay}s`,
            transitionProperty: property,
            transitionDuration: `${durationIn}s`,
            transitionTimingFunction: easing,
        }

        el._data_transition.enter.start = {
            opacity: opacityValue,
            transform: `scale(${scaleValue})`,
        }

        el._data_transition.enter.end = {
            opacity: 1,
            transform: `scale(1)`,
        }
    }

    if (transitioningOut) {
        el._data_transition.leave.during = {
            transformOrigin: origin,
            transitionDelay: `${delay}s`,
            transitionProperty: property,
            transitionDuration: `${durationOut}s`,
            transitionTimingFunction: easing,
        }

        el._data_transition.leave.start = {
            opacity: 1,
            transform: `scale(1)`,
        }

        el._data_transition.leave.end = {
            opacity: opacityValue,
            transform: `scale(${scaleValue})`,
        }
    }
}

function registerTransitionObject(el: any, setFunction: any, defaultValue: any = {}) {
    if (! el._data_transition) el._data_transition = {
        enter: { during: defaultValue, start: defaultValue, end: defaultValue },

        leave: { during: defaultValue, start: defaultValue, end: defaultValue },

        in(before = () => {}, after = () => {}) {
            transition(el, setFunction, {
                during: this.enter.during,
                start: this.enter.start,
                end: this.enter.end,
            }, before, after)
        },

        out(before = () => {}, after = () => {}) {
            transition(el, setFunction, {
                during: this.leave.during,
                start: this.leave.start,
                end: this.leave.end,
            }, before, after)
        },
    }
}

(window as any).Element.prototype._data_toggleAndCascadeWithTransitions = function (el: any, value: any, show: any, hide: any) {
    const nextTick = document.visibilityState === 'visible' ? requestAnimationFrame : setTimeout;
    let clickAwayCompatibleShow = () => nextTick(show);

    if (value) {
        if (el._data_transition && (el._data_transition.enter || el._data_transition.leave)) {
            (el._data_transition.enter && (Object.entries(el._data_transition.enter.during).length || Object.entries(el._data_transition.enter.start).length || Object.entries(el._data_transition.enter.end).length))
                ? el._data_transition.in(show)
                : clickAwayCompatibleShow()
        } else {
            el._data_transition
                ? el._data_transition.in(show)
                : clickAwayCompatibleShow()
        }

        return
    }

    el._data_hidePromise = el._data_transition
        ? new Promise((resolve: any, reject: any) => {
            el._data_transition.out(() => {}, () => resolve(hide))

            el._data_transitioning && el._data_transitioning.beforeCancel(() => reject({ isFromCancelledTransition: true }))
        })
        : Promise.resolve(hide)

    queueMicrotask(() => {
        let closest = closestHide(el)

        if (closest) {
            if (! closest._data_hideChildren) closest._data_hideChildren = []

            closest._data_hideChildren.push(el)
        } else {
            nextTick(() => {
                let hideAfterChildren = (el: any) => {
                    let carry = Promise.all([
                        el._data_hidePromise,
                        ...(el._data_hideChildren || []).map(hideAfterChildren),
                    ]).then(([i]: any[]) => i?.())

                    delete el._data_hidePromise
                    delete el._data_hideChildren

                    return carry
                }

                hideAfterChildren(el).catch((e: any) => {
                    if (! e.isFromCancelledTransition) throw e
                })
            })
        }
    })
}

function closestHide(el: any) {
    let parent = el.parentNode

    if (! parent) return

    return parent._data_hidePromise ? parent : closestHide(parent)
}

export function transition(el: any, setFunction: any, { during, start, end }: any = {}, before: any = () => {}, after: any = () => {}) {
    if (el._data_transitioning) el._data_transitioning.cancel()

    if (Object.keys(during).length === 0 && Object.keys(start).length === 0 && Object.keys(end).length === 0) {
        before(); after()
        return
    }

    let undoStart: any, undoDuring: any, undoEnd: any

    performTransition(el, {
        start() {
            undoStart = setFunction(el, start)
        },
        during() {
            undoDuring = setFunction(el, during)
        },
        before,
        end() {
            undoStart()

            undoEnd = setFunction(el, end)
        },
        after,
        cleanup() {
            undoDuring()
            undoEnd()
        },
    })
}

export function performTransition(el: any, stages: any) {
    let interrupted: any, reachedBefore: any, reachedEnd: any

    let finish = once(() => {
        mutateDom(() => {
            interrupted = true

            if (! reachedBefore) stages.before()

            if (! reachedEnd) {
                stages.end()

                releaseNextTicks()
            }

            stages.after()

            if (el.isConnected) stages.cleanup()

            delete el._data_transitioning
        })
    })

    el._data_transitioning = {
        beforeCancels: [],
        beforeCancel(callback: any) { this.beforeCancels.push(callback) },
        cancel: once(function () { while (this.beforeCancels.length) { this.beforeCancels.shift()() }; finish(); }),
        finish,
    }

    mutateDom(() => {
        stages.start()
        stages.during()
    })

    holdNextTicks()

    requestAnimationFrame(() => {
        if (interrupted) return

        let duration = Number(getComputedStyle(el).transitionDuration.replace(/,.*/, '').replace('s', '')) * 1000
        let delay = Number(getComputedStyle(el).transitionDelay.replace(/,.*/, '').replace('s', '')) * 1000

        if (duration === 0) duration = Number(getComputedStyle(el).animationDuration.replace('s', '')) * 1000

        mutateDom(() => {
            stages.before()
        })

        reachedBefore = true

        requestAnimationFrame(() => {
            if (interrupted) return

            mutateDom(() => {
                stages.end()
            })

            releaseNextTicks()

            setTimeout((el as any)._data_transitioning.finish, duration + delay)

            reachedEnd = true
        })
    })
}

export function modifierValue(modifiers: any, key: any, fallback: any) {
    if (modifiers.indexOf(key) === -1) return fallback

    const rawValue = modifiers[modifiers.indexOf(key) + 1]

    if (! rawValue) return fallback

    if (key === 'scale') {
        if (isNaN(rawValue)) return fallback
    }

    if (key === 'duration' || key === 'delay') {
        let match = rawValue.match(/([0-9]+)ms/)
        if (match) return match[1]
    }

    if (key === 'origin') {
        if (['top', 'right', 'left', 'center', 'bottom'].includes(modifiers[modifiers.indexOf(key) + 2])) {
            return [rawValue, modifiers[modifiers.indexOf(key) + 2]].join(' ')
        }
    }

    return rawValue
}
