import { directive } from '../engine/directives'
// import { effect } from '../engine/reactivity'

// Nexus-UX router. Attach to <html> via data-router.
// Supports:
// - registering routes via data-route
// - navigate(url, { replace })
// - route matching with params, wildcards
// - beforeEnter/afterEnter hooks via route definitions

type RouteDef = { path: string, component?: string | null, handler?: string | null, meta?: any, redirect?: string | null, layout?: string | null, beforeEnter?: string | null, afterEnter?: string | null, beforeLeave?: string | null, afterLeave?: string | null }

function matchRoute(urlPath: string, routePattern: string) {
    const paramNames: string[] = []
    const regexPath = routePattern
        .replace(/\(:(?:[^/]+)\?/g, '(?:/([^/]+))?')
        .replace(/:([^/]+)/g, (_m: string, name: string) => { paramNames.push(name); return '([^/]+)' })
        .replace(/\*$/, '(.*)')

    const regex = new RegExp(`^${regexPath}`)
    const m = urlPath.match(regex)
    if (!m) return { matched: false, params: {} }
    const params: Record<string,string> = {}
    paramNames.forEach((n, i) => { params[n] = m[i+1] })
    if (routePattern.endsWith('*')) params['wildcard'] = m[paramNames.length + 1]
    return { matched: true, params }
}

async function executeHook(
    hookString: string | null | undefined,
    ctx: { params?: any; query?: any; abortController?: AbortController | null; currentRoute?: any; previousRoute?: any }
): Promise<boolean | string> {
    if (!hookString) {
        return true; // No hook, proceed
    }
    try {
        const hookFn = new Function('ctx', `return (${hookString})(ctx)`)
        const result = await Promise.resolve(hookFn(ctx))
        return result
    } catch (e) {
        console.error(`[Nexus-UX Router] Error executing hook: ${hookString}`, e)
        // Optionally update router state with error
        return false; // Stop navigation on hook error
    }
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
        previous: null, // Stores previous route's state for hooks
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

    let currentAbortController: AbortController | null = null;

    async function navigate(url: string, options?: { replace?: boolean }) {
        const fullUrl = new URL(url, window.location.origin)
        const currentPath = state.path
        const currentMeta = state.meta

        currentAbortController = new AbortController()

        // Execute beforeLeave hook
        if (currentMeta && currentMeta.beforeLeave) {
            const hookCtx = {
                params: state.params,
                query: state.query,
                abortController: currentAbortController,
                currentRoute: currentPath,
                previousRoute: state.previous
            }
            const hookResult = await executeHook(currentMeta.beforeLeave, hookCtx)
            if (hookResult === false) {
                console.log('[Nexus-UX Router] beforeLeave hook returned false, stopping navigation.')
                state.loading = false
                return
            } else if (typeof hookResult === 'string') {
                console.log('[Nexus-UX Router] beforeLeave hook redirected to:', hookResult)
                navigate(hookResult, { replace: true })
                return
            }
        }

        const scrollY = window.scrollY
        if (options?.replace) {
            history.replaceState({ scrollY }, '', fullUrl.pathname + fullUrl.search + fullUrl.hash)
        } else {
            history.pushState({ scrollY }, '', fullUrl.pathname + fullUrl.search + fullUrl.hash)
        }
        onRouteChange(currentAbortController)
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

    async function onRouteChange(abortController: AbortController | null = null) {
        state.loading = true
        const previousPath = state.path
        const previousMeta = state.meta

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

            // Store previous state for hooks
            state.previous = { path: previousPath, meta: previousMeta };

            if (chosen && chosen.def.beforeEnter) {
                const hookCtx = { params: chosen.params, query: q, abortController }
                const hookResult = await executeHook(chosen.def.beforeEnter, hookCtx)
                if (hookResult === false) { state.loading = false; return }
                if (typeof hookResult === 'string') { navigate(hookResult, { replace: true }); return }
            }

            if (chosen && chosen.def.handler) {
                const hookCtx = { params: chosen.params, query: q, abortController }
                const handlerResult = await executeHook(chosen.def.handler, hookCtx)
                if (handlerResult === false) { state.loading = false; return }
                if (typeof handlerResult === 'string') { navigate(handlerResult, { replace: true }); return }
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

            // Scroll position restoration and hash scrolling
            queueMicrotask(async () => {
                const savedScrollY = history.state?.scrollY
                if (savedScrollY !== undefined && savedScrollY !== null) {
                    window.scrollTo(0, savedScrollY)
                    state.scrollPosition = { x: 0, y: savedScrollY }
                } else if (urlObj.hash) {
                    const targetElement = document.getElementById(urlObj.hash.substring(1))
                    if (targetElement) {
                        targetElement.scrollIntoView()
                        state.scrollPosition = { x: window.scrollX, y: window.scrollY }
                    }
                } else {
                    window.scrollTo(0, 0)
                    state.scrollPosition = { x: 0, y: 0 }
                }

                // afterEnter hook
                if (chosen && chosen.def.afterEnter) {
                    const hookCtx = { params: chosen.params, query: q, abortController }
                    await executeHook(chosen.def.afterEnter, hookCtx)
                }

                // afterLeave hook (for the previous route)
                if (previousMeta && previousMeta.afterLeave && state.path !== previousPath) {
                    const hookCtx = {
                        params: state.params,
                        query: state.query,
                        abortController: abortController,
                        currentRoute: state.path,
                        previousRoute: state.previous
                    }
                    await executeHook(previousMeta.afterLeave, hookCtx)
                }
            })

        } finally {
            state.loading = false
        }
    }

    // handle popstate
    const onPop = () => onRouteChange(currentAbortController)
    window.addEventListener('popstate', onPop)
    document.removeEventListener('click', onClick)

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
