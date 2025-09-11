import { skipDuringClone } from '../engine/clone'
import { directive } from '../engine/directives'
import { initTree, destroyTree } from '../engine/lifecycle'
import { mutateDom } from '../engine/mutation'
import { addScopeToNode } from '../engine/scope'
import { warn } from '../utils/warn'

directive('teleport', (el: any, { modifiers, expression }: any, { cleanup }: any) => {
    if (el.tagName.toLowerCase() !== 'template') warn('data-teleport can only be used on a <template> tag', el)

    let target = getTarget(expression)

    let clone = el.content.cloneNode(true).firstElementChild

    el._data_teleport = clone
    clone._data_teleportBack = el

    el.setAttribute('data-teleport-template', true)
    clone.setAttribute('data-teleport-target', true)

    if (el._data_forwardEvents) {
        el._data_forwardEvents.forEach((eventName: any) => {
            clone.addEventListener(eventName, (e: any) => {
                e.stopPropagation()

                el.dispatchEvent(new e.constructor(e.type, e))
            })
        })
    }

    addScopeToNode(clone, {}, el)

    let placeInDom = (clone: any, target: any, modifiers: any) => {
        if (modifiers.includes('prepend')) {
            target.parentNode.insertBefore(clone, target)
        } else if (modifiers.includes('append')) {
            target.parentNode.insertBefore(clone, target.nextSibling)
        } else {
            target.appendChild(clone)
        }
    }

    mutateDom(() => {
        placeInDom(clone, target, modifiers)

        skipDuringClone(() => {
            initTree(clone)
        })()
    })

    el._data_teleportPutBack = () => {
        let target = getTarget(expression)

        mutateDom(() => {
            placeInDom(el._data_teleport, target, modifiers)
        })
    }

    cleanup(() =>
      mutateDom(() => {
        clone.remove()
        destroyTree(clone)
      })
    )
})

let teleportContainerDuringClone = document.createElement('div')

function getTarget(expression: any) {
    let target = skipDuringClone(() => {
        return document.querySelector(expression)
    }, () => {
        return teleportContainerDuringClone
    })()

    if (! target) warn(`Cannot find data-teleport element for selector: "${expression}"`)

    return target
}
