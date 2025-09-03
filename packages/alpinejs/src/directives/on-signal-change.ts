import { directive } from '../directives'
import { effect } from '../reactivity'

// Port of Nexus-UX OnSignalChange attribute (best-effort)
// This requires a signals system; Alpine's packages have `signals` module but it's not the same.

directive('onSignalChange', (el: any, { expression, value, modifiers }: any, { cleanup }: any) => {
    // In Nexus-UX this listens to global STATE_SIGNAL_EVENT or watches matching signals.
    // Here we provide a best-effort: if expression is empty, listen for a custom event on document named 'state-signals'

    if (!expression) {
        const handler = (evt: any) => {
            // call evaluate with event
        }
        document.addEventListener('state-signals', handler)
        cleanup(() => document.removeEventListener('state-signals', handler))
        return
    }

    // If expression is provided, we can't map Nexus signal graph directly; user may call global function from event.
    const handler = (evt: any) => {
        // no-op placeholder
    }

    document.addEventListener('state-signals', handler)
    cleanup(() => document.removeEventListener('state-signals', handler))
})
