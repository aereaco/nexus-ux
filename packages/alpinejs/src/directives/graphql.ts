import { directive } from '../directives'
import { signal } from '../signals'

// GraphQL directive: publishes results to an Alpine signal provider.
directive('graphql', (el: any, { expression }: any, { cleanup, evaluate }: any) => {
    const urlAttr = el.getAttribute('data-graphql-url') || '/graphql'
    const variablesAttr = el.getAttribute('data-graphql-variables') || '{}'
    const methodAttr = el.getAttribute('data-graphql-method') || 'POST'
    const headersAttr = el.getAttribute('data-graphql-headers') || '{}'
    const resultSignal = el.getAttribute('data-graphql-result-signal') || 'graphql.result'

    // register a provider that returns the last result when called
    let lastResult: any = null
    signal(resultSignal, () => lastResult)

    const execute = async () => {
        try {
            const query = expression
            const variables = (() => { try { return JSON.parse(variablesAttr) } catch(e) { return {} } })()
            const headers = (() => { try { return JSON.parse(headersAttr) } catch(e) { return {} } })()

            const response = await fetch(urlAttr, {
                method: methodAttr,
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify({ query, variables }),
            })

            const result = await response.json()
            lastResult = result
            // dispatch an event for backward compatibility
            el.dispatchEvent(new CustomEvent('graphql:result', { detail: result }))
        } catch (e) {
            el.dispatchEvent(new CustomEvent('graphql:error', { detail: e }))
        }
    }

    execute()

    const pollInterval = parseInt(el.getAttribute('data-graphql-poll-interval') || '0', 10)
    let timer: number | undefined
    if (pollInterval > 0) timer = setInterval(execute, pollInterval) as any

    cleanup(() => { if (timer) clearInterval(timer) })
})
