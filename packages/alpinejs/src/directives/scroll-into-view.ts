import { directive } from '../directives'
import { evaluate } from '../evaluator'

// Port of Nexus-UX ScrollIntoView: performs one-time scroll into view on load

directive('scrollIntoView', (el: any, { modifiers, rawName }: any) => {
    const performScroll = () => {
        if (!(el instanceof HTMLElement || el instanceof SVGElement)) return
        if (!el.tabIndex) el.setAttribute('tabindex', '0')

        const opts: any = { behavior: 'smooth', block: 'center', inline: 'center' }
        if (modifiers.includes('instant')) opts.behavior = 'instant'
        if (modifiers.includes('auto')) opts.behavior = 'auto'
        if (modifiers.includes('hstart')) opts.inline = 'start'
        if (modifiers.includes('hcenter')) opts.inline = 'center'
        if (modifiers.includes('hend')) opts.inline = 'end'
        if (modifiers.includes('hnearest')) opts.inline = 'nearest'
        if (modifiers.includes('vstart')) opts.block = 'start'
        if (modifiers.includes('vcenter')) opts.block = 'center'
        if (modifiers.includes('vend')) opts.block = 'end'
        if (modifiers.includes('vnearest')) opts.block = 'nearest'
        if (modifiers.includes('focus')) el.focus()

        el.scrollIntoView(opts)
        // remove attribute dataset to avoid re-triggering
        if (rawName) delete el.dataset[rawName.replace(/^data-/, '').replace(/:/g, '-')]
    }

    performScroll()
})
