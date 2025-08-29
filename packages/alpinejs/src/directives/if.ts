import { evaluateLater } from '../evaluator'
import { addScopeToNode } from '../scope'
import { directive } from '../directives'
import { initTree, destroyTree } from '../lifecycle'
import { mutateDom } from '../mutation'
import { warn } from "../utils/warn"
import { skipDuringClone } from '../clone'

directive('if', (el: any, { expression }: any, { effect, cleanup }: any) => {
    if (el.tagName.toLowerCase() !== 'template') warn('data-if can only be used on a <template> tag', el)

    let evaluate = evaluateLater(el, expression)

    let show = () => {
        if (el._data_currentIfEl) return el._data_currentIfEl

        let clone = el.content.cloneNode(true).firstElementChild

        addScopeToNode(clone, {}, el)

        mutateDom(() => {
            el.after(clone)

            skipDuringClone(() => initTree(clone))()
        })

        el._data_currentIfEl = clone

        el._data_undoIf = () => {
            mutateDom(() => {
                destroyTree(clone)

                clone.remove()
            })

            delete el._data_currentIfEl
        }

        return clone
    }

    let hide = () => {
        if (! el._data_undoIf) return

        el._data_undoIf()

        delete el._data_undoIf
    }

    effect(() => evaluate((value: any) => {
        value ? show() : hide()
    }))

    cleanup(() => el._data_undoIf && el._data_undoIf())
})
