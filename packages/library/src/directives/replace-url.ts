import { directive } from '../engine/directives'
import { evaluateLater } from '../engine/evaluator'
import { signal } from '../engine/signals'

// ReplaceUrl: updates the browser URL using replaceState. Also notifies any router signal if present.

directive('replaceUrl', (el: any, { expression }: any, { effect }: any) => {
    const rx = evaluateLater(el, expression)

    const applyReplaceUrl = () => {
        rx((url: string) => {
            if (!url) return
            const baseUrl = window.location.href
            const fullUrl = new URL(url, baseUrl).toString()
            window.history.replaceState({}, '', fullUrl)
            // update router signal provider if registered
            try { signal('router', () => ({ location: fullUrl })) } catch (e) {}
            document.dispatchEvent(new CustomEvent('replace-url', { detail: { url: fullUrl } }))
        })
    }

    const cleanup = effect(applyReplaceUrl)
})
