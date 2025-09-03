import { directive } from '../directives'

// Best-effort port: listens for custom event 'state-signals-patch' and invokes expression

directive('onSignalPatch', (el: any, { expression }: any, { evaluateLater }: any) => {
    const handler = (evt: any) => {
        // try to call user expression with patched data available as $event.detail
        if (expression) {
            evaluateLater(el, expression)(() => {}, { scope: { '$event': evt } })
        }
    }
    document.addEventListener('state-signals-patch', handler)
    return () => document.removeEventListener('state-signals-patch', handler)
})
