import { reportError } from './errors.ts';

/**
 * Standardized MCP Client for Nexus-UX.
 * Implements JSON-RPC 2.0 over SSE transport.
 */
export class MCPClient {
  private url: string;
  private eventSource: EventSource | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, (res: unknown) => void>();
  private onConnectCallback?: () => void;
  private onMessageCallback?: (event: string, data: unknown) => void;

  constructor(serverUrl: string) {
    this.url = serverUrl;
  }

  /**
   * Connect to the MCP server via SSE.
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.url);
        
        this.eventSource.onopen = () => {
          if (this.onConnectCallback) this.onConnectCallback();
          resolve();
        };

        this.eventSource.onerror = (err) => {
          reportError(new Error(`MCP Connection failed: ${this.url}`));
          reject(err);
        };

        this.eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            this.handleIncoming(payload);
          } catch (_e) {
            reportError(new Error(`MCP Malformed JSON: ${event.data}`));
          }
        };

        // Handle specific MCP event types if the server uses the 'event' field
        this.eventSource.addEventListener('message', (e: MessageEvent) => {
           try {
             const payload = JSON.parse(e.data);
             this.handleIncoming(payload);
           } catch (_e) { /* ignore raw data */ }
        });

      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Send a JSON-RPC 2.0 request to the MCP server via POST.
   */
  public sendRequest<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = ++this.requestId;
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params
    });

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, (res: unknown) => resolve(res as T));

      fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      }).catch(err => {
        this.pendingRequests.delete(id);
        reject(err);
      });
    });
  }

  /**
   * Handle incoming JSON-RPC messages (Responses or Notifications).
   */
  private handleIncoming(payload: { id?: number, method?: string, params?: unknown, result?: unknown, error?: unknown }): void {
    if (payload.id !== undefined) {
      // Response
      const resolve = this.pendingRequests.get(payload.id);
      if (resolve) {
        this.pendingRequests.delete(payload.id);
        resolve(payload.result || payload.error);
      }
    } else if (payload.method) {
      // Notification (e.g. notifications/resources/updated)
      if (this.onMessageCallback) {
        this.onMessageCallback(payload.method, payload.params);
      }
    }
  }

  public onConnect(cb: () => void) { this.onConnectCallback = cb; }
  public onNotification(cb: (event: string, data: unknown) => void) { this.onMessageCallback = cb; }

  public disconnect() {
    this.eventSource?.close();
  }
}
