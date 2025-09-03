import { directive } from '../directives'

// Simplified port of Nexus-UX Route attribute
// Registers a route definition into window.$router.routes (array) if present

directive('route', (el: any, { value, expression, modifiers }: any, { evaluate }: any) => {
    const path = value || expression
    const routeDef: any = { path }

    const handler = el.getAttribute('data-route:handler')
    if (handler) routeDef.handler = handler
    const meta = el.getAttribute('data-route:meta')
    if (meta) {
        try { routeDef.meta = JSON.parse(meta) } catch { routeDef.meta = meta }
    }
    const redirect = el.getAttribute('data-route:redirect')
    if (redirect) routeDef.redirect = redirect
    const layout = el.getAttribute('data-route:layout')
    if (layout) routeDef.layout = layout

    // register route on the global router object (router directive exposes a compatible API)
    if (!(window as any).$router) (window as any).$router = { routes: [] }
    if (!Array.isArray((window as any).$router.routes)) (window as any).$router.routes = []
    ;(window as any).$router.routes.push(routeDef)

    // cleanup on element removal
    return () => {
        try { (window as any).$router.routes = (window as any).$router.routes.filter((r: any) => r.path !== path) } catch (e) {}
    }
})
