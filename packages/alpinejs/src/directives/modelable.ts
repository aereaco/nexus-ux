import { directive } from '../directives'
import { entangle } from '../entangle';

directive('modelable', (el: any, { expression }: any, { effect, evaluateLater, cleanup }: any) => {
    let func = evaluateLater(expression)
    let innerGet = () => { let result: any; func((i: any) => result = i); return result; }
    let evaluateInnerSet = evaluateLater(`${expression} = __placeholder`)
    let innerSet = (val: any) => evaluateInnerSet(() => {}, { scope: { '__placeholder': val }})

    let initialValue = innerGet()

    innerSet(initialValue)

    queueMicrotask(() => {
        if (! el._data_model) return

        el._data_removeModelListeners['default']()

        let outerGet = el._data_model.get
        let outerSet = el._data_model.set

        let releaseEntanglement = entangle(
            {
                get() { return outerGet() },
                set(value: any) { outerSet(value) },
            },
            {
                get() { return innerGet() },
                set(value: any) { innerSet(value) },
            },
        )

        cleanup(releaseEntanglement)
    })
})
