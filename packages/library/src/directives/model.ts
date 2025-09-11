import bind, { isCheckbox, isRadio, safeParseBoolean } from '../utils/bind'
import { evaluateLater } from '../engine/evaluator'
import { directive } from '../engine/directives'
import { mutateDom } from '../engine/mutation'
import { nextTick } from '../engine/nextTick'
import { isCloning } from '../engine/clone'
import on from '../utils/on'

directive('model', (el: any, { modifiers, expression }: any, { effect, cleanup }: any) => {
    let scopeTarget: any = el

    if (modifiers.includes('parent')) {
        scopeTarget = el.parentNode
    }

    let evaluateGet = evaluateLater(scopeTarget, expression)
    let evaluateSet: any

    if (typeof expression === 'string') {
        evaluateSet = evaluateLater(scopeTarget, `${expression} = __placeholder`)
    } else if (typeof expression === 'function' && typeof expression() === 'string') {
        evaluateSet = evaluateLater(scopeTarget, `${expression()} = __placeholder`)
    } else {
        evaluateSet = () => {}
    }

    let getValue = () => {
        let result: any

        evaluateGet((value: any) => result = value)

        return isGetterSetter(result) ? result.get() : result
    }

    let setValue = (value: any) => {
        let result: any

        evaluateGet((value: any) => result = value)

        if (isGetterSetter(result)) {
            result.set(value)
        } else {
            evaluateSet(() => {}, {
                scope: { '__placeholder': value }
            })
        }
    }

    if (typeof expression === 'string' && el.type === 'radio') {
        mutateDom(() => {
            if (! el.hasAttribute('name')) el.setAttribute('name', expression)
        })
    }

    var event = (el.tagName.toLowerCase() === 'select')
        || ['checkbox', 'radio'].includes(el.type)
        || modifiers.includes('lazy')
            ? 'change' : 'input'

    let removeListener = isCloning ? () => {} : on(el, event, modifiers, (e: any) => {
        setValue(getInputValue(el, modifiers, e, getValue()))
    })

    if (modifiers.includes('fill'))
        if ([undefined, null, ''].includes(getValue())
            || (isCheckbox(el) && Array.isArray(getValue()))
            || (el.tagName.toLowerCase() === 'select' && el.multiple)) {
        setValue(
            getInputValue(el, modifiers, { target: el }, getValue())
        );
    }

    if (! el._data_removeModelListeners) el._data_removeModelListeners = {}
    el._data_removeModelListeners['default'] = removeListener

    cleanup(() => el._data_removeModelListeners['default']())

    if (el.form) {
        let removeResetListener = on(el.form, 'reset', [], (e: any) => {
            nextTick(() => el._data_model && el._data_model.set(getInputValue(el, modifiers, { target: el }, getValue())))
        })
        cleanup(() => removeResetListener())
    }

    el._data_model = {
        get() {
            return getValue()
        },
        set(value: any) {
            setValue(value)
        },
    }

    el._data_forceModelUpdate = (value: any) => {
        if (value === undefined && typeof expression === 'string' && (expression as string).match(/\./)) {
            value = ''
        }

        (window as any).fromModel = true
        mutateDom(() => bind(el, 'value', value))
        delete (window as any).fromModel
    }

    effect(() => {
        let value = getValue()

        if (modifiers.includes('unintrusive') && document.activeElement.isSameNode(el)) return

        el._data_forceModelUpdate(value)
    })
})

function getInputValue(el: any, modifiers: any, event: any, currentValue: any) {
    return mutateDom(() => {
        if (event instanceof CustomEvent && event.detail !== undefined)
            return event.detail !== null && event.detail !== undefined ? event.detail : (event.target as any).value
        else if (isCheckbox(el)) {
            if (Array.isArray(currentValue)) {
                let newValue: any = null;

                if (modifiers.includes('number')) {
                    newValue = safeParseNumber(event.target.value)
                } else if (modifiers.includes('boolean')) {
                    newValue = safeParseBoolean(event.target.value)
                } else {
                    newValue = event.target.value
                }

                return event.target.checked
                    ? (currentValue.includes(newValue) ? currentValue : currentValue.concat([newValue]))
                    : currentValue.filter((el: any) => ! checkedAttrLooseCompare(el, newValue));
            } else {
                return event.target.checked
            }
        } else if (el.tagName.toLowerCase() === 'select' && el.multiple) {
            if (modifiers.includes('number')) {
                return Array.from(event.target.selectedOptions).map((option: any) => {
                    let rawValue = option.value || option.text
                    return safeParseNumber(rawValue)
                })
            } else if (modifiers.includes('boolean')) {
                return Array.from(event.target.selectedOptions).map((option: any) => {
                    let rawValue = option.value || option.text
                    return safeParseBoolean(rawValue)
                })
            }

            return Array.from(event.target.selectedOptions).map((option: any) => {
                return option.value || option.text
            })
        } else {
            let newValue: any

            if (isRadio(el)) {
                if (event.target.checked) {
                    newValue = event.target.value
                } else {
                    newValue = currentValue
                }
            } else {
                newValue = event.target.value
            }

            if (modifiers.includes('number')) {
                return safeParseNumber(newValue)
            } else if (modifiers.includes('boolean')) {
                return safeParseBoolean(newValue)
            } else if (modifiers.includes('trim')) {
                return newValue.trim()
            } else {
                return newValue
            }
        }
    })
}

function safeParseNumber(rawValue: any) {
    let number = rawValue ? parseFloat(rawValue) : null

    return isNumeric(number) ? number : rawValue
}

function checkedAttrLooseCompare(valueA: any, valueB: any) {
    return valueA == valueB
}

function isNumeric(subject: any){
    return ! Array.isArray(subject) && ! isNaN(subject)
}

function isGetterSetter(value: any) {
    return value !== null && typeof value === 'object' && typeof value.get === 'function' && typeof value.set === 'function'
}
