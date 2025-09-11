import { directive } from '../engine/directives'
import { evaluate } from '../engine/evaluator'

// Usage: data-custom-validity="expression"

directive('customValidity', (el: any, { expression }: any, { effect }: any) => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) {
        throw new Error('customValidity can only be used on form controls')
    }

    const apply = () => {
        const result = evaluate(el, expression)
        if (typeof result !== 'string') {
            throw new Error('customValidity expression must evaluate to a string')
        }
        el.setCustomValidity(result)
    }

    const cleanup = effect(apply)
    // No explicit mutation callback in State; return cleanup via element-bound utilities handled by directive system
})
