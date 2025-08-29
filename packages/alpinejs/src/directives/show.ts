import { evaluateLater } from '../evaluator'
import { directive } from '../directives'
import { mutateDom } from '../mutation'
import { once } from '../utils/once'

directive('show', (el: any, { modifiers, expression }: any, { effect }: any) => {
    let evaluate = evaluateLater(el, expression)

    if (! el._data_doHide) el._data_doHide = () => {
        mutateDom(() => {
            el.style.setProperty('display', 'none', modifiers.includes('important') ? 'important' : undefined)
        })
    }

    if (! el._data_doShow) el._data_doShow = () => {
        mutateDom(() => {
            if (el.style.length === 1 && el.style.display === 'none') {
                el.removeAttribute('style')
            } else {
                el.style.removeProperty('display')
            }
        })
    }

    let hide = () => {
        el._data_doHide()
        el._data_isShown = false
    }

    let show = () => {
        el._data_doShow()
        el._data_isShown = true
    }

    let clickAwayCompatibleShow = () => setTimeout(show)

    let toggle = once(
        (value: any) => value ? show() : hide(),
        (value: any) => {
            if (typeof el._data_toggleAndCascadeWithTransitions === 'function') {
                el._data_toggleAndCascadeWithTransitions(el, value, show, hide)
            } else {
                value ? clickAwayCompatibleShow() : hide()
            }
        }
    )

    let oldValue: any
    let firstTime = true

    effect(() => evaluate((value: any) => {
        if (! firstTime && value === oldValue) return

        if (modifiers.includes('immediate')) value ? clickAwayCompatibleShow() : hide()

        toggle(value)

        oldValue = value
        firstTime = false
    }))
})
