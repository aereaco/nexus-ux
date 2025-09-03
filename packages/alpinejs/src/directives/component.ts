import { directive } from '../directives'

// Alpine-native port of Nexus-UX `data-component`.
// Features:
// - Resolve inline template strings, data: URLs, #fragment ids, and fetched URLs
// - Parse <template>, extract styles and scripts
// - Apply styles to Shadow DOM (constructable sheets preferred) or light DOM (rewrite :host)
// - Execute inline scripts with a component-scoped context
// - Re-initialize Alpine on attached content via initTree
// - Support reactive source updates by using the directive's evaluate/effect utilities

function parseComponentHTML(htmlString: string) {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html')
    let templateElement = doc.querySelector('template')
    let shadowMode: string | null = null
    if (!templateElement) {
        // fallback to body content
        templateElement = document.createElement('template')
        while (doc.body.firstChild) templateElement.content.appendChild(doc.body.firstChild)
    }

    shadowMode = templateElement.getAttribute('shadowrootmode')

    const templateContent = templateElement.content
    const styles = Array.from(templateContent.querySelectorAll('style, link[rel="stylesheet"]')) as (HTMLStyleElement | HTMLLinkElement)[]
    const scripts = Array.from(templateContent.querySelectorAll('script')) as HTMLScriptElement[]

    // remove scripts/styles from fragment so they are not executed twice when appended
    styles.forEach(s => s.remove())
    scripts.forEach(s => s.remove())

    return { templateContent, styles, scripts, shadowMode }
}

async function fetchTemplate(source: string, evaluateFn: any) {
    let evaluated = source
    try {
        // allow dynamic expressions like $ signals via evaluate
        evaluated = evaluateFn ? evaluateFn() : source
    } catch (e) {
        // ignore and fall back to raw source
    }

    if (typeof evaluated !== 'string' || !evaluated) throw new Error('Component source must be a non-empty string')

    const hashIndex = evaluated.indexOf('#')
    let urlPart = evaluated
    let fragmentId: string | null = null
    if (hashIndex !== -1) {
        urlPart = evaluated.substring(0, hashIndex)
        fragmentId = evaluated.substring(hashIndex + 1)
    }

    if (urlPart.trim() === '') {
        if (!fragmentId) throw new Error('Template fragment id required')
        const tpl = document.getElementById(fragmentId)
        if (!tpl || !(tpl instanceof HTMLTemplateElement)) throw new Error('Template not found on page')
        return tpl.outerHTML
    }

    if (urlPart.trim().startsWith('<template>')) return urlPart

    if (urlPart.trim().startsWith('data:')) {
        const parts = urlPart.split(',')
        const metadata = parts[0].substring(5)
        const data = parts.slice(1).join(',')
        if (metadata.includes('base64')) return atob(data)
        return decodeURIComponent(data)
    }

    // fetch url
    const resp = await fetch(urlPart)
    if (!resp.ok) throw new Error(`Failed to fetch component: ${resp.statusText}`)
    return await resp.text()
}

function applyStyles(root: ShadowRoot | HTMLElement, styles: (HTMLStyleElement | HTMLLinkElement)[], tagName: string, isShadow: boolean) {
    if (isShadow && 'adoptedStyleSheets' in (root as ShadowRoot)) {
        const sheets: CSSStyleSheet[] = []
        for (const node of styles) {
            if (node.tagName === 'STYLE') {
                try {
                    const sheet = new CSSStyleSheet()
                    sheet.replaceSync(node.textContent || '')
                    sheets.push(sheet)
                } catch (e) {
                    // fallback
                    const clone = node.cloneNode(true) as HTMLElement
                    root.appendChild(clone)
                }
            } else {
                // link rel=stylesheet - append to root
                root.appendChild(node.cloneNode(true))
            }
        }
        try { (root as ShadowRoot).adoptedStyleSheets = [...(root as ShadowRoot).adoptedStyleSheets, ...sheets] } catch (e) {}
    } else {
        for (const node of styles) {
            const clone = node.cloneNode(true) as HTMLStyleElement | HTMLLinkElement
            if (clone.tagName === 'STYLE' && !isShadow) {
                clone.textContent = (clone.textContent || '').replace(/:host/g, tagName)
            }
            root.appendChild(clone)
        }
    }
}

async function executeScripts(scripts: HTMLScriptElement[], ctx: any, rootEl: HTMLElement | ShadowRoot) {
    const contextId = `__component_ctx_${Date.now()}_${Math.random().toString(36).slice(2)}`
    ;(window as any)[contextId] = ctx

    const cleanupFns: (() => void)[] = []
    ctx.actions = ctx.actions || {}

    // helper to capture exported symbols from a module namespace object
    const captureExports = (ns: any) => {
        if (!ns) return
        Object.keys(ns).forEach(k => {
            if (k === 'default') return
            try { ctx.actions[k] = ns[k].bind ? ns[k] : ns[k] }
            catch (e) { ctx.actions[k] = ns[k] }
        })
    }

    for (const script of scripts) {
        if (script.type && script.type.includes('module')) {
            // handle module scripts
            if (script.src) {
                try {
                    const ns = await import(script.src)
                    captureExports(ns)
                } catch (e) {
                    console.error('Failed to import module script', e)
                }
                continue
            }

            // inline module: create blob and import
            const content = script.textContent || ''
            try {
                const blob = new Blob([content], { type: 'text/javascript' })
                const url = URL.createObjectURL(blob)
                const ns = await import(url)
                captureExports(ns)
                cleanupFns.push(() => URL.revokeObjectURL(url))
            } catch (e) {
                console.error('Component inline module error', e)
            }
            continue
        }

        // non-module external script
        if (script.src) {
            const s = document.createElement('script')
            s.type = script.type || 'text/javascript'
            s.src = script.src
            rootEl.appendChild(s)
            cleanupFns.push(() => s.remove())
            continue
        }

        // Inline non-module script: run in a function with ctx param
        const content = script.textContent || ''
        try {
            const fn = new Function('ctx', content)
            fn((window as any)[contextId])
        } catch (e) {
            console.error('Component inline script error', e)
        }
    }

    // return cleanup that removes global context and any appended nodes if needed
    return () => {
        delete (window as any)[contextId]
        cleanupFns.forEach(fn => fn())
    }
}

directive('component', (el: any, { expression }: any, { evaluate, evaluateLater, effect, cleanup, initTree }: any) => {
    let currentCleanup: (() => void) | undefined
    let currentSource: string | undefined = expression

    const generateScopedId = (baseId: string) => `${el.tagName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}-${baseId}`

    const renderFromSource = async (source: string | undefined) => {
        // cleanup previous
        currentCleanup && currentCleanup()
        if (!source) return

        // resolve expression if it's dynamic
        let resolvedSource = source
        try {
            resolvedSource = evaluate ? evaluate(source) : source
        } catch (e) {
            // ignore
        }

        try {
            const html = await fetchTemplate(resolvedSource, () => evaluate(resolvedSource))
            const { templateContent, styles, scripts, shadowMode } = parseComponentHTML(html)

            // clear existing content
            while (el.firstChild) el.removeChild(el.firstChild)

            const useShadow = !!shadowMode
            const root = useShadow ? el.attachShadow({ mode: 'open' }) : el

            // apply styles
            applyStyles(root as any, styles, el.tagName.toLowerCase(), useShadow)

            // append cloned template
            root.appendChild(templateContent.cloneNode(true))

            // initialize Alpine within the new content
            try { initTree(root as any) } catch (e) { /* ignore */ }

            // build script context
            const ctx = {
                el,
                evaluate: (expr: string) => evaluate ? evaluate(expr) : undefined,
                evaluateLater: evaluateLater ? evaluateLater.bind(null, el) : undefined,
                generateScopedId,
                registerCleanup: (fn: any) => {
                    if (typeof fn === 'function') cleanup(fn)
                }
            }

            // execute scripts (may return a Promise resolving to cleanup)
            const scriptsCleanupResult: any = await executeScripts(scripts, ctx, root as any)

            currentCleanup = () => {
                try {
                    if (typeof scriptsCleanupResult === 'function') scriptsCleanupResult()
                    else if (scriptsCleanupResult && typeof scriptsCleanupResult.then === 'function') {
                        scriptsCleanupResult.then((fn: any) => { try { fn && fn() } catch(e){} })
                    }
                } catch (e) {}

                // remove appended nodes
                if (useShadow) {
                    try { if ((el as any).shadowRoot) (el as any).shadowRoot.innerHTML = '' } catch (e) {}
                } else {
                    while (el.firstChild) el.removeChild(el.firstChild)
                }
            }

            cleanup(() => currentCleanup && currentCleanup())
        } catch (e) {
            console.error('[component] render failed', e)
        }
    }

    // initial render
    renderFromSource(currentSource)

    // react to attribute changes through mutation callback
    const mutationCallback = (newVal: string | null) => {
        currentSource = newVal || undefined
        renderFromSource(currentSource)
    }

    // return cleanup/mutation shape similar to Nexus attribute contract
    return { cleanupCallback: () => { currentCleanup && currentCleanup() }, mutationCallback }
})
