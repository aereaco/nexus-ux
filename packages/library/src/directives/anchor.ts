import { computePosition, autoUpdate, flip, offset, shift } from '@floating-ui/dom'

export default function (State: any) {
    State.sprite('anchor', (el: any) => {
        if (! el._data_anchor) throw 'State: No data-anchor directive found on element using $anchor...'

        return el._data_anchor
    })

    State.interceptClone((from: any, to: any) => {
        if (from && from._data_anchor && ! to._data_anchor) {
            to._data_anchor = from._data_anchor
        }
    })

    State.directive('anchor', State.skipDuringClone((el: any, { expression, modifiers, value }: any, { cleanup, evaluate }: any) => {
        let { placement, offsetValue, unstyled } = getOptions(modifiers)

        el._data_anchor = State.reactive({ x: 0, y: 0 })

        let reference = evaluate(expression)

        if (! reference) throw 'State: no element provided to data-anchor...'

        let compute = () => {
            let previousValue: any

            computePosition(reference, el, {
                placement: placement as any,
                middleware: [flip(), shift({padding: 5}), offset(offsetValue)],
            }).then(({ x, y }: any) => {
                unstyled || setStyles(el, x, y)

                if (JSON.stringify({ x, y }) !== previousValue) {
                    el._data_anchor.x = x
                    el._data_anchor.y = y
                }

                previousValue = JSON.stringify({ x, y })
            })
        }

        let release = autoUpdate(reference, el, () => compute())

        cleanup(() => release())
    },

    (el: any, { expression, modifiers, value }: any, { cleanup, evaluate }: any) => {
        let { placement, offsetValue, unstyled } = getOptions(modifiers)

        if (el._data_anchor) {
            unstyled || setStyles(el, el._data_anchor.x, el._data_anchor.y)
        }
    }))
}

function setStyles(el: any, x: number, y: number) {
    Object.assign(el.style, {
        left: x+'px', top: y+'px', position: 'absolute',
    })
}

function getOptions(modifiers: any[]) {
    let positions = ['top', 'top-start', 'top-end', 'right', 'right-start', 'right-end', 'bottom', 'bottom-start', 'bottom-end', 'left', 'left-start', 'left-end']
    let placement = positions.find(i => modifiers.includes(i))
    let offsetValue = 0
    if (modifiers.includes('offset')) {
        let idx = modifiers.findIndex(i => i === 'offset')

        offsetValue = modifiers[idx + 1] !== undefined ? Number(modifiers[idx + 1]) : offsetValue
    }
    let unstyled = modifiers.includes('no-style')

    return { placement, offsetValue, unstyled }
}
