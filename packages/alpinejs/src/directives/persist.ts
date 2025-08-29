import { directive } from '../directives'

// Persist directive - saves element's Alpine state to localStorage or sessionStorage
directive('persist', (el: any, { expression, modifiers, value }: any, { effect, cleanup, evaluate, Alpine }: any) => {
    // 1. Parse Configuration
    const storage = modifiers.includes('session') ? sessionStorage : localStorage
    const key = expression || el.getAttribute('id') || 'alpine_persist'

    let filterOptions: { include?: RegExp, exclude?: RegExp } | null = null
    if (value) {
        try {
            const parsed = evaluate(value)
            if (parsed && (parsed.include || parsed.exclude)) {
                filterOptions = {
                    include: parsed.include ? new RegExp(parsed.include) : undefined,
                    exclude: parsed.exclude ? new RegExp(parsed.exclude) : undefined,
                }
            }
        } catch (e) {
            console.error('Alpine Persist: Filter expression error', e)
        }
    }

    // 2. Initial Load from Storage & Merge
    try {
        const storedSignal = storage.getItem(key)
        if (storedSignal) {
            const parsedSignal = JSON.parse(storedSignal)
            // Merge the stored signal into the initial data-signal object
            Object.assign(Alpine.signal(el), parsedSignal)
        }
    } catch (e) {
        console.error('Alpine Persist: Failed to parse stored signal', e)
        storage.removeItem(key)
    }

    // 3. Reactive Persistence Logic
    const saveState = () => {
        const signalToSave = Alpine.signal(el)
        let filteredSignal: Record<string, any> = {}

        if (modifiers.includes('all')) {
            filteredSignal = signalToSave
        } else {
            // For now, persist the whole object when no specific keys are provided.
            filteredSignal = signalToSave
        }

        if (filterOptions) {
            filteredSignal = Object.fromEntries(
                Object.entries(filteredSignal).filter(([k]) => {
                    const includeMatch = filterOptions!.include ? filterOptions!.include.test(k) : true
                    const excludeMatch = filterOptions!.exclude ? !filterOptions!.exclude.test(k) : true
                    return includeMatch && excludeMatch
                })
            )
        }

        try {
            storage.setItem(key, JSON.stringify(filteredSignal))
        } catch (e) {
            console.error('Alpine Persist: Failed to save to storage', e)
        }
    }

    // 4. Setup reactive listener
    const stopWatcher = effect(() => {
        // Touch the reactive signal to establish dependency
        const reactiveSignal = Alpine.signal(el)
        // console.debug('persist: detected change, saving...')
        saveState()
    })

    // 5. Cleanup
    cleanup(() => {
        stopWatcher()
    })
})