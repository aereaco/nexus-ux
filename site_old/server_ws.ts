import { serve } from "https://deno.land/std@0.150.0/http/server.ts";

const port = 8080;
let connectedClients = new Set<WebSocket>();

const handler = (request: Request): Response => {
  const upgrade = request.headers.get("upgrade") || "";
  
  if (upgrade.toLowerCase() != "websocket") {
    return new Response("This is a mock WebSocket endpoint.", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(request);

  socket.onopen = () => {
    console.log("[MockServer] Client Connected");
    connectedClients.add(socket);
  };

  socket.onmessage = (e) => {
    console.log(`[MockServer] Received: ${e.data}`);
    // Echo the message back immediately
    try {
      const parsed = JSON.parse(e.data);
      socket.send(JSON.stringify({ ...parsed, echo: true, serverReceivedAt: new Date().toISOString() }));
    } catch {
      socket.send(JSON.stringify({ type: 'echo', raw: e.data, serverReceivedAt: new Date().toISOString() }));
    }
  };

  socket.onerror = (e) => console.error("[MockServer] Error:", e);
  socket.onclose = () => {
    console.log("[MockServer] Client Disconnected");
    connectedClients.delete(socket);
  };

  return response;
};

// Start broadcasting simulated background server events every 3 seconds
setInterval(() => {
  if (connectedClients.size === 0) return;
  const payload = JSON.stringify({
    type: 'live_tick',
    serverUptime: performance.now(),
    timestamp: new Date().toLocaleTimeString()
  });
  
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}, 3000);

console.log(`[MockServer] Ready: ws://localhost:${port}/live`);
serve(handler, { port });
