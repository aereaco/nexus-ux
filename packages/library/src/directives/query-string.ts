import { directive } from '../engine/directives'
import { signal, /*injectSignalProviders*/ } from '../engine/signals'

// Sync location.search into a signal provider. Default provider name: 'queryString'

signal('queryString', (el?: HTMLElement) => {
    const params = new URLSearchParams(window.location.search)
    const out: Record<string, string> = {}
    params.forEach((v, k) => out[k] = v)
    return out
})

directive('queryString', (el: any, { expression }: any, { cleanup, evaluate }: any) => {
    // Allow a custom signal name via attribute: data-query-string-signal
    const providedName = el.getAttribute('data-query-string-signal')
    const providerName = providedName || 'queryString'

    // On popstate, re-register the signal provider by updating the signals map.
    const popHandler = () => {
        // update the provider to return fresh params
        signal(providerName, () => {
            const params = new URLSearchParams(window.location.search)
            const out: Record<string, string> = {}
            params.forEach((v, k) => out[k] = v)
            return out
        })
        // emit a simple event for any listeners
        document.dispatchEvent(new CustomEvent('query-string:change', { detail: { name: providerName } }))
    }

    window.addEventListener('popstate', popHandler)
    cleanup(() => window.removeEventListener('popstate', popHandler))
})
