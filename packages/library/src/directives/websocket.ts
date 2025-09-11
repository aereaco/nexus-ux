import { directive } from '../engine/directives'
import { signal } from '../engine/signals'

directive('websocket', (el: any, { expression }: any, { cleanup, evaluateLater }: any) => {
    const url = expression
    const protocolsAttr = el.getAttribute('data-websocket-protocols') || '[]'
    const protocols = (() => { try { return JSON.parse(protocolsAttr) } catch(e) { return [] } })()
    const statusKey = el.getAttribute('data-websocket-status-signal') || 'ws.status'
    const messageKey = el.getAttribute('data-websocket-message-signal') || 'ws.message'

    let ws: WebSocket | null = null
    let lastStatus: string = 'closed'
    let lastMessage: any = null

    // register simple providers
    signal(statusKey, () => lastStatus)
    signal(messageKey, () => lastMessage)

    const connect = (u: string) => {
        try {
            ws = new WebSocket(u, protocols as any)
            lastStatus = 'connecting'

            ws.onopen = (ev) => {
                lastStatus = 'open'
                el.dispatchEvent(new CustomEvent('websocket:open', { detail: ev }))
            }
            ws.onmessage = (ev) => {
                lastMessage = ev.data
                el.dispatchEvent(new CustomEvent('websocket:message', { detail: ev }))
            }
            ws.onclose = (ev) => {
                lastStatus = 'closed'
                el.dispatchEvent(new CustomEvent('websocket:close', { detail: ev }))
            }
            ws.onerror = (ev) => {
                lastStatus = 'error'
                el.dispatchEvent(new CustomEvent('websocket:error', { detail: ev }))
            }
        } catch (e) {
            lastStatus = 'error'
            el.dispatchEvent(new CustomEvent('websocket:error', { detail: e }))
        }
    }

    connect(url)

    // expose a small send helper via element property for convenience
    ;(el as any).sendWebsocket = (data: any) => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(data)
        else throw new Error('WebSocket not open')
    }

    cleanup(() => { ws?.close(); try { delete (el as any).sendWebsocket } catch(e) {} })
})
