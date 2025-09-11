import { directive } from '../engine/directives'
import { evaluateLater } from '../engine/evaluator'

// Port of Nexus-UX ViewTransition attribute (sets element.style.viewTransitionName)

directive('viewTransition', (el: any, { expression }: any, { effect }: any) => {
    // If browser doesn't support viewTransitionName, no-op
    if (!('viewTransition' in document)) return

    const rx = evaluateLater(el, expression)

    const apply = () => rx((name: string) => {
        const style: any = el.style
        style.viewTransitionName = name || ''
    })

    effect(apply)
})
