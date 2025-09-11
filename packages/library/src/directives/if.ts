import { evaluateLater } from '../engine/evaluator'
import { addScopeToNode } from '../engine/scope'
import { directive } from '../engine/directives'
import { initTree, destroyTree } from '../engine/lifecycle'
import { mutateDom } from '../engine/mutation'
import { warn } from "../utils/warn"
import { skipDuringClone } from '../engine/clone'

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
