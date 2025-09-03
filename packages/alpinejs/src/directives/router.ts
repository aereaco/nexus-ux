import { directive } from '../directives'
import { effect } from '../reactivity'

// Alpine-native router inspired by Nexus-UX. Attach to <html> via data-router.
// Supports:
// - registering routes via data-route
// - navigate(url, { replace })
// - route matching with params, wildcards
// - beforeEnter/afterEnter hooks via route definitions

type RouteDef = { path: string, component?: string | null, handler?: string | null, meta?: any, redirect?: string | null, layout?: string | null, beforeEnter?: string | null, afterEnter?: string | null, beforeLeave?: string | null, afterLeave?: string | null }

function matchRoute(urlPath: string, routePattern: string) {
    const paramNames: string[] = []
    const regexPath = routePattern
        .replace(/\\(:(?:[^/]+))\\?/g, '(?:/([^/]+))?')
        .replace(/:([^/]+)/g, (_m: string, name: string) => { paramNames.push(name); return '([^/]+)' })
        .replace(/\*$/, '(.*)')

    const regex = new RegExp(`^${regexPath}$`)
    const m = urlPath.match(regex)
    if (!m) return { matched: false, params: {} }
    const params: Record<string,string> = {}
    paramNames.forEach((n, i) => { params[n] = m[i+1] })
    if (routePattern.endsWith('*')) params['wildcard'] = m[paramNames.length + 1]
    return { matched: true, params }
}

directive('router', (el: any, { value }: any, { cleanup }: any) => {
    if (el.tagName !== 'HTML') return

    // Router state
    const state: any = {
        path: '',
        params: {},
        query: {},
        hash: '',
        loading: false,
        error: null,
        previous: null,
        layout: null,
        route: null,
        meta: {},
        scrollPosition: { x: 0, y: 0 },
        routes: [],
        default: null,
        basePath: '/',
        mode: 'hybrid'
    }

    // determine basePath
    const manualBase = document.documentElement.getAttribute('data-router.base-path')
    if (manualBase !== null) state.basePath = manualBase
    else {
        const pathname = window.location.pathname
        const lastSlash = pathname.lastIndexOf('/')
        const lastSeg = pathname.substring(lastSlash + 1)
        if (lastSeg.includes('.')) state.basePath = pathname.substring(0, lastSlash + 1)
        else state.basePath = pathname.endsWith('/') ? pathname : pathname + '/'
    }

    // expose $router global
    ;(window as any).$router = { ...( (window as any).$router || {}), state, navigate }

    function navigate(url: string, options?: { replace?: boolean }) {
        const full = url
        if (options?.replace) history.replaceState({}, '', full)
        else history.pushState({}, '', full)
        onRouteChange()
    }

    const routeRegister = (r: RouteDef) => { state.routes.push(r) }

    // click interception for internal links
    const onClick = (e: MouseEvent) => {
        const a = (e.target as Element).closest('a') as HTMLAnchorElement | null
        if (!a || !a.href) return
        if (a.hasAttribute('data-native') || a.target === '_blank') return
        const u = new URL(a.href)
        if (u.origin !== location.origin) return
        e.preventDefault()
        let relative = u.pathname
        const base = state.basePath
        if (relative.startsWith(base)) relative = relative.substring(base.length - 1)
        navigate(relative + u.search + u.hash)
    }

    async function onRouteChange() {
        state.loading = true
        try {
            const urlObj = new URL(window.location.href)
            let pathname = urlObj.pathname
            const base = state.basePath || '/'
            if (pathname.startsWith(base)) pathname = pathname.substring(base.length - 1)
            if (!pathname.startsWith('/')) pathname = '/' + pathname

            // parse query
            const q: Record<string,string> = {}
            urlObj.searchParams.forEach((v,k) => q[k] = v)

            // try explicit routes
            let chosen: null | { def: RouteDef, params: any } = null
            for (const def of state.routes) {
                const res = matchRoute(pathname, def.path)
                if (res.matched) { chosen = { def, params: res.params }; break }
            }

            if (chosen && chosen.def.beforeEnter) {
                const r = new Function('ctx', `return (${chosen!.def.beforeEnter})(ctx)`)
                const hookResult = await Promise.resolve(r({ params: chosen.params, query: q }))
                if (hookResult === false) { state.loading = false; return }
                if (typeof hookResult === 'string') { navigate(hookResult, { replace: true }); return }
            }

            if (chosen) {
                state.path = pathname
                state.params = chosen.params
                state.query = q
                state.route = chosen.def.component || null
                state.meta = chosen.def.meta || {}
            } else {
                // fallback: try static fetch of index.html or page
                let potential = pathname
                if (potential.endsWith('/')) potential += 'index.html'
                else if (!potential.includes('.')) potential += '.html'
                try {
                    const resp = await fetch(state.basePath + potential.replace(/^[\/]/, ''))
                    if (resp.ok) {
                        state.route = state.basePath + potential.replace(/^[\/]/, '')
                        state.path = pathname
                        state.query = q
                    } else {
                        state.error = { type: '404' }
                    }
                } catch (e) { state.error = { type: 'fetch_error', message: e.message } }
            }

            // afterEnter hook
            if (chosen && chosen.def.afterEnter) {
                const r = new Function('ctx', `return (${chosen!.def.afterEnter})(ctx)`)
                await Promise.resolve(r({ params: chosen.params, query: q }))
            }

        } finally {
            state.loading = false
        }
    }

    // handle popstate
    const onPop = () => onRouteChange()
    window.addEventListener('popstate', onPop)
    document.addEventListener('click', onClick)

    // initial resolve
    onRouteChange()

    cleanup(() => {
        window.removeEventListener('popstate', onPop)
        document.removeEventListener('click', onClick)
    })

    // return mutation callback for changes to data-router attribute
    return {
        cleanupCallback: () => { window.removeEventListener('popstate', onPop); document.removeEventListener('click', onClick) },
        mutationCallback: (newVal: any) => {
            // could support dynamic config in future
        }
    }
})
