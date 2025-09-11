import { directive } from '../engine/directives'
import { evaluateLater } from '../engine/evaluator'

// Port of Nexus-UX OnRaf attribute

directive('onRaf', (el: any, { expression, modifiers }: any, { cleanup }: any) => {
    let rafId: number | undefined

    const callback = evaluateLater(el, expression)

    const loop = () => {
        callback(() => {})
        rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    cleanup(() => {
        if (rafId) cancelAnimationFrame(rafId)
    })
})
