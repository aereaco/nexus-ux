import { dontAutoEvaluateFunctions, evaluate } from '../engine/evaluator'
import { reactive } from '../engine/reactivity'
import { setClasses } from './classes'
import { setStyles } from './styles'

export default function bind(el: any, name: string, value: any, modifiers: any[] = []) {
    if (! el._data_bindings) el._data_bindings = reactive({})

    el._data_bindings[name] = value

    name = modifiers.includes('camel') ? camelCase(name) : name

    switch (name) {
        case 'value':
            bindInputValue(el, value)
            break;

        case 'style':
            bindStyles(el, value)
            break;

        case 'class':
            bindClasses(el, value)
            break;

        case 'selected':
        case 'checked':
            bindAttributeAndProperty(el, name, value)
            break;

        default:
            bindAttribute(el, name, value)
            break;
    }
}

function bindInputValue(el: any, value: any) {
    if (isRadio(el)) {
        if (el.attributes.value === undefined) {
            el.value = value
        }

        if ((window as any).fromModel) {
            if (typeof value === 'boolean') {
                el.checked = safeParseBoolean(el.value) === value
            } else {
                el.checked = checkedAttrLooseCompare(el.value, value)
            }
        }
    } else if (isCheckbox(el)) {
        if (Number.isInteger(value)) {
            el.value = value
        } else if (! Array.isArray(value) && typeof value !== 'boolean' && ! [null, undefined].includes(value)) {
            el.value = String(value)
        } else {
            if (Array.isArray(value)) {
                el.checked = value.some((val: any) => checkedAttrLooseCompare(val, el.value))
            } else {
                el.checked = !!value
            }
        }
    } else if (el.tagName === 'SELECT') {
        updateSelect(el, value)
    } else {
        if (el.value === value) return

        el.value = value === undefined ? '' : value
    }
}

function bindClasses(el: any, value: any) {
    if (el._data_undoAddedClasses) el._data_undoAddedClasses()

    el._data_undoAddedClasses = setClasses(el, value)
}

function bindStyles(el: any, value: any) {
    if (el._data_undoAddedStyles) el._data_undoAddedStyles()

    el._data_undoAddedStyles = setStyles(el, value)
}

function bindAttributeAndProperty(el: any, name: string, value: any) {
    bindAttribute(el, name, value)
    setPropertyIfChanged(el, name, value)
}

function bindAttribute(el: any, name: string, value: any) {
    if ([null, undefined, false].includes(value) && attributeShouldntBePreservedIfFalsy(name)) {
        el.removeAttribute(name)
    } else {
        if (isBooleanAttr(name)) value = name

        setIfChanged(el, name, value)
    }
}

function setIfChanged(el: any, attrName: string, value: any) {
    if (el.getAttribute(attrName) != value) {
        el.setAttribute(attrName, value)
    }
}

function setPropertyIfChanged(el: any, propName: string, value: any) {
    if (el[propName] !== value) {
        el[propName] = value
    }
}

function updateSelect(el: any, value: any) {
    const arrayWrappedValue = [].concat(value).map((value: any) => { return value + '' })

    Array.from(el.options).forEach((option: any) => {
        option.selected = arrayWrappedValue.includes(option.value)
    })
}

function camelCase(subject: string) {
    return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase())
}

function checkedAttrLooseCompare(valueA: any, valueB: any) {
    return valueA == valueB
}

export function safeParseBoolean(rawValue: any) {
    if ([1, '1', 'true', 'on', 'yes', true].includes(rawValue)) {
        return true
    }

    if ([0, '0', 'false', 'off', 'no', false].includes(rawValue)) {
        return false
    }

    return rawValue ? Boolean(rawValue) : null
}

const booleanAttributes = new Set([
    'allowfullscreen',
    'async',
    'autofocus',
    'autoplay',
    'checked',
    'controls',
    'default',
    'defer',
    'disabled',
    'formnovalidate',
    'inert',
    'ismap',
    'itemscope',
    'loop',
    'multiple',
    'muted',
    'nomodule',
    'novalidate',
    'open',
    'playsinline',
    'readonly',
    'required',
    'reversed',
    'selected',
    'shadowrootclonable',
    'shadowrootdelegatesfocus',
    'shadowrootserializable',
])

function isBooleanAttr(attrName: string) {
    return booleanAttributes.has(attrName)
}

function attributeShouldntBePreservedIfFalsy(name: string) {
    return ! ['aria-pressed', 'aria-checked', 'aria-expanded', 'aria-selected'].includes(name)
}

export function getBinding(el: any, name: string, fallback: any) {
    if (el._data_bindings && el._data_bindings[name] !== undefined) return el._data_bindings[name]

    return getAttributeBinding(el, name, fallback)
}

export function extractProp(el: any, name: string, fallback: any, extract = true) {
    if (el._data_bindings && el._data_bindings[name] !== undefined) return el._data_bindings[name]

    if (el._data_inlineBindings && el._data_inlineBindings[name] !== undefined) {
        let binding = el._data_inlineBindings[name]

        binding.extract = extract

        return dontAutoEvaluateFunctions(() => {
            return evaluate(el, binding.expression)
        })
    }

    return getAttributeBinding(el, name, fallback)
}

function getAttributeBinding(el: any, name: string, fallback: any) {
    let attr = el.getAttribute(name)

    if (attr === null) return typeof fallback === 'function' ? fallback() : fallback

    if (attr === '') return true

    if (isBooleanAttr(name)) {
        return !! [name, 'true'].includes(attr)
    }

    return attr
}

export function isCheckbox(el: any) {
    return el.type === 'checkbox' || el.localName === 'ui-checkbox' || el.localName === 'ui-switch'
}

export function isRadio(el: any) {
    return el.type === 'radio' || el.localName === 'ui-radio'
}
