import { directive } from '../directives'
import { evaluate } from '../evaluator'

// Port of Nexus-UX CustomValidity attribute. Uses Alpine directive api.
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
    // No explicit mutation callback in Alpine; return cleanup via element-bound utilities handled by directive system
})
