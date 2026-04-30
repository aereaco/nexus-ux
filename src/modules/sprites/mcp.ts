import { SpriteModule } from '../index.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reactive, effect } from '../../engine/reactivity.ts';

/**
 * Universal $mcp Sprite.
 * Orchestrates Sampling, Resources, and Tools via the MCP Protocol.
 */
export const mcpModule: SpriteModule = {
  name: 'mcp',
  key: '$mcp',
  handle: (context: RuntimeContext) => {
    const client = context.mcp;

    /**
     * Throttled Accumulator for Streaming
     */
    class StreamBuffer {
      private buffer = '';
      private lastFlush = 0;
      private signal: any;

      constructor(targetSignal: any) {
        this.signal = targetSignal;
      }

      append(chunk: string) {
        this.buffer += chunk;
        const now = performance.now();
        if (now - this.lastFlush > 16) { // 60fps throttle
          this.flush();
        }
      }

      flush() {
        this.signal.value = this.buffer;
        this.lastFlush = performance.now();
      }
    }

    return {
      /**
       * AI Sampling: $mcp.ask(prompt)
       */
      ask: (prompt: string) => {
        if (!client) return "Error: No MCP Server configured.";
        
        const output = reactive({ value: '' });
        const buffer = new StreamBuffer(output);

        client.sendRequest('sampling/createMessage', {
          messages: [{ role: 'user', content: { type: 'text', text: prompt } }]
        }).then((res: any) => {
          if (res?.content?.text) {
             buffer.append(res.content.text);
             buffer.flush();
          }
        });

        // Handle streaming notifications if supported by the server
        client.onNotification('notifications/sampling/delta', (params: any) => {
           if (params.delta?.text) {
             buffer.append(params.delta.text);
           }
        });

        return output;
      },

      /**
       * Resource Reading: $mcp.read(uri)
       */
      read: async (uri: string) => {
        if (!client) throw new Error("No MCP Server configured.");
        const res: any = await client.sendRequest('resources/read', { uri });
        return res?.contents?.[0]?.text || null;
      },

      /**
       * Tool Calling: $mcp.call(name, args)
       */
      call: async (name: string, args: any = {}) => {
        if (!client) throw new Error("No MCP Server configured.");
        const res: any = await client.sendRequest('tools/call', { name, arguments: args });
        return res?.content?.[0] || null;
      }
    };
  }
};
