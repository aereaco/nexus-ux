import { directive, prefix } from '../engine/directives'
import { initInterceptors } from '../engine/interceptor'
import { injectSignalProviders } from '../engine/signals'
import { addRootSelector } from '../engine/lifecycle'
import { interceptClone, isCloning, isCloningLegacy } from '../engine/clone'
import { addScopeToNode } from '../engine/scope'
import { injectSprites, /*sprite*/ } from '../engine/sprites'
import { reactive } from '../engine/reactivity'
import { evaluate } from '../engine/evaluator'

addRootSelector(() => `[${prefix('signal')}]`)

directive('signal', ((el: any, { expression, modifiers }: any, { cleanup }: any) => {
    if (shouldSkipRegisteringSignalDuringClone(el)) return

    expression = expression === '' ? '{}' : expression

    let spriteContext: any = {}
    injectSprites(spriteContext, el)

    let signalProviderContext: any = {}
    injectSignalProviders(signalProviderContext, spriteContext)

    let initialSignal: any = evaluate(el, expression, { scope: signalProviderContext })

    if (initialSignal === undefined || initialSignal === true) initialSignal = {}

    injectSprites(initialSignal, el)

    let reactiveSignal = reactive(initialSignal)

    initInterceptors(reactiveSignal)

    let undo = addScopeToNode(el, reactiveSignal, el)

    // Helper to merge data with ifmissing logic
    const mergeData = (source: any) => {
        if (modifiers.includes('ifmissing')) {
            for (const key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key) && !Object.prototype.hasOwnProperty.call(reactiveSignal, key)) {
                    reactiveSignal[key] = source[key];
                }
            }
        } else {
            Object.assign(reactiveSignal, source);
        }
    };

    if (modifiers.includes('fetch')) {
        const url = expression; // Expression is treated as URL for fetch
        if (typeof url !== 'string' || !url) {
            console.error('[Nexus-UX Signal] Invalid URL provided to fetch signals:', url);
            return;
        }

        reactiveSignal.loading = true; // Set loading state
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch signals from ${url}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                mergeData(data); // Merge fetched data
            })
            .catch(error => {
                console.error('[Nexus-UX Signal] Error fetching signals:', error);
                reactiveSignal.error = error.message; // Set error state
            })
            .finally(() => {
                reactiveSignal.loading = false; // Clear loading state
            });
    }

    reactiveSignal['init'] && evaluate(el, reactiveSignal['init'])

    cleanup(() => {
        reactiveSignal['destroy'] && evaluate(el, reactiveSignal['destroy'])

        undo()
    })
}))

interceptClone((from: any, to: any) => {
    if (from._data_signalStack) {
        to._data_signalStack = from._data_signalStack

        to.setAttribute('signal-has-state', true)
    }
})

function shouldSkipRegisteringSignalDuringClone(el: any) {
    if (! isCloning) return false
    if (isCloningLegacy) return true

    return el.hasAttribute('signal-has-state')
}
