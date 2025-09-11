import { directive, prefix } from '../engine/directives'
import { initInterceptors } from '../engine/interceptor'
import { injectSignalProviders } from '../engine/signals'
import { addRootSelector } from '../engine/lifecycle'
import { interceptClone, isCloning, isCloningLegacy } from '../engine/clone'
import { addScopeToNode } from '../engine/scope'
import { injectMagics, /*magic*/ } from '../engine/magics'
import { reactive } from '../engine/reactivity'
import { evaluate } from '../engine/evaluator'

addRootSelector(() => `[${prefix('signal')}]`)

directive('signal', ((el: any, { expression }: any, { cleanup }: any) => {
    if (shouldSkipRegisteringSignalDuringClone(el)) return

    expression = expression === '' ? '{}' : expression

    let magicContext: any = {}
    injectMagics(magicContext, el)

    let signalProviderContext: any = {}
    injectSignalProviders(signalProviderContext, magicContext)

    let signal: any = evaluate(el, expression, { scope: signalProviderContext })

    if (signal === undefined || signal === true) signal = {}

    injectMagics(signal, el)

    let reactiveSignal = reactive(signal)

    initInterceptors(reactiveSignal)

    let undo = addScopeToNode(el, reactiveSignal, el)

    reactiveSignal['init'] && evaluate(el, reactiveSignal['init'])

    cleanup(() => {
        reactiveSignal['destroy'] && evaluate(el, reactiveSignal['destroy'])

        undo()
    })
}))

interceptClone((from: any, to: any) => {
    if (from._data_signalStack) {
        to._data_signalStack = from._data_signalStack

        to.setAttribute('signal-has-state', true)
    }
})

function shouldSkipRegisteringSignalDuringClone(el: any) {
    if (! isCloning) return false
    if (isCloningLegacy) return true

    return el.hasAttribute('signal-has-state')
}
