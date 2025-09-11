import { directive } from '../engine/directives'
import { evaluateLater } from '../engine/evaluator'

// Port of Nexus-UX OnLoad attribute

directive('onLoad', (el: any, { expression, modifiers }: any, { cleanup }: any) => {
    let timeoutId: number | undefined
    const callback = evaluateLater(el, expression)

    const parseDelay = (mods: string[]) => {
        // Expect modifier like delay=500 or delay=1s; doesn't support key/value modifiers so we accept a leading modifier value
        const delayMod = mods.find(m => m.startsWith('delay'))
        if (!delayMod) return 0
        const m = delayMod.match(/delay=(.+)/)
        if (!m) return 0
        const v = m[1]
        if (/^[0-9]+$/.test(v)) return parseInt(v, 10)
        const s = v.match(/([0-9.]+)s$/)
        if (s) return Math.round(parseFloat(s[1]) * 1000)
        return 0
    }

    const setupOnLoad = () => {
        if (timeoutId) clearTimeout(timeoutId)
        const wait = parseDelay(modifiers)
        timeoutId = setTimeout(() => callback(() => {}), wait) as any
    }

    setupOnLoad()

    cleanup(() => {
        if (timeoutId) clearTimeout(timeoutId)
    })
})
