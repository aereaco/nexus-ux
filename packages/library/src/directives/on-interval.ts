import { directive } from '../engine/directives'
import { evaluateLater } from '../engine/evaluator'

// Port of Nexus-UX OnInterval attribute
// Usage: data-on-interval="expression" .duration(1s) .leading

directive('onInterval', (el: any, { expression, modifiers }: any, { cleanup }: any) => {
    let intervalId: number | undefined

    const parseDuration = (modValue: string | undefined) => {
        if (!modValue) return 1000
        // simple ms parser: supports numbers and s suffix
        if (/^[0-9]+$/.test(modValue)) return parseInt(modValue, 10)
        const m = modValue.match(/([0-9.]+)s$/)
        if (m) return Math.round(parseFloat(m[1]) * 1000)
        return 1000
    }

    const callback = evaluateLater(el, expression)

    const setupInterval = () => {
        if (intervalId) clearInterval(intervalId)

        const durationArg = modifiers[0]
        const duration = parseDuration(durationArg)

        const leading = modifiers.includes('leading')
        if (leading) callback(() => {})

        intervalId = setInterval(() => callback(() => {}), duration) as any
    }

    setupInterval()

    cleanup(() => {
        if (intervalId) clearInterval(intervalId)
    })
})
