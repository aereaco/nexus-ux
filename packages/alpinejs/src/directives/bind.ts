import { directive, into, mapAttributes, prefix, startingWith } from '../directives'
import { evaluateLater } from '../evaluator'
import { mutateDom } from '../mutation'
import bind from '../utils/bind'
import { applyBindingsObject, injectBindingProviders } from '../binds'

mapAttributes(startingWith(':', into(prefix('bind:'))))

let handler: any = (el: any, { value, modifiers, expression, original }: any, { effect, cleanup }: any) => {
    if (! value) {
        let bindingProviders: any = {}
        injectBindingProviders(bindingProviders)

        let getBindings = evaluateLater(el, expression)

        getBindings((bindings: any) => {
            applyBindingsObject(el, bindings, original)
        }, { scope: bindingProviders } )

        return
    }

    if (value === 'key') return storeKeyForXFor(el, expression)

    if (el._data_inlineBindings && el._data_inlineBindings[value] && el._data_inlineBindings[value].extract) {
        return
    }

    let evaluate = evaluateLater(el, expression)

    effect(() => evaluate((result: any) => {
        if (result === undefined && typeof expression === 'string' && expression.match(/\./)) {
            result = ''
        }

        mutateDom(() => bind(el, value, result, modifiers))
    }))

    cleanup(() => {
        el._data_undoAddedClasses && el._data_undoAddedClasses()
        el._data_undoAddedStyles && el._data_undoAddedStyles()
    })
}

// mark inline as optional on the handler for TS
;(handler as any).inline = (el: any, { value, modifiers, expression }: any) => {
    if (! value) return;

    if (! el._data_inlineBindings) el._data_inlineBindings = {}

    el._data_inlineBindings[value] = { expression, extract: false }
}

directive('bind', handler)

function storeKeyForXFor(el: any, expression: string) {
    el._data_keyExpression = expression
}
