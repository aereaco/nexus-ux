import { directive, prefix } from '../directives'
import { initInterceptors } from '../interceptor'
import { injectSignalProviders } from '../signals'
import { addRootSelector } from '../lifecycle'
import { interceptClone, isCloning, isCloningLegacy } from '../clone'
import { addScopeToNode } from '../scope'
import { injectMagics, magic } from '../magics'
import { reactive } from '../reactivity'
import { evaluate } from '../evaluator'

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

        to.setAttribute('signal-has-alpine-state', true)
    }
})

function shouldSkipRegisteringSignalDuringClone(el: any) {
    if (! isCloning) return false
    if (isCloningLegacy) return true

    return el.hasAttribute('signal-has-alpine-state')
}
