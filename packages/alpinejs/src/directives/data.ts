import { directive, prefix } from '../directives'
import { initInterceptors } from '../interceptor'
import { injectDataProviders } from '../datas'
import { addRootSelector } from '../lifecycle'
import { interceptClone, isCloning, isCloningLegacy } from '../clone'
import { addScopeToNode } from '../scope'
import { injectMagics, magic } from '../magics'
import { reactive } from '../reactivity'
import { evaluate } from '../evaluator'

addRootSelector(() => `[${prefix('data')}]`)

directive('data', ((el: any, { expression }: any, { cleanup }: any) => {
    if (shouldSkipRegisteringDataDuringClone(el)) return

    expression = expression === '' ? '{}' : expression

    let magicContext: any = {}
    injectMagics(magicContext, el)

    let dataProviderContext: any = {}
    injectDataProviders(dataProviderContext, magicContext)

    let data: any = evaluate(el, expression, { scope: dataProviderContext })

    if (data === undefined || data === true) data = {}

    injectMagics(data, el)

    let reactiveData = reactive(data)

    initInterceptors(reactiveData)

    let undo = addScopeToNode(el, reactiveData, el)

    reactiveData['init'] && evaluate(el, reactiveData['init'])

    cleanup(() => {
        reactiveData['destroy'] && evaluate(el, reactiveData['destroy'])

        undo()
    })
}))

interceptClone((from: any, to: any) => {
    if (from._data_dataStack) {
        to._data_dataStack = from._data_dataStack

        to.setAttribute('data-has-alpine-state', true)
    }
})

function shouldSkipRegisteringDataDuringClone(el: any) {
    if (! isCloning) return false
    if (isCloningLegacy) return true

    return el.hasAttribute('data-has-alpine-state')
}
