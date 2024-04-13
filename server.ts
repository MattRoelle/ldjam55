import { GAME_MAP, ServerCommand, ServerState } from "./core.ts";
import {
  initServerState,
  processCommandQueue,
  processTick,
} from "./game-logic.ts";

// Constants
const PORT = 8080;
const TICK_INTERVAL = 1000; // 1 second per game tick
const HTML_PATH = "./index.html"; // Path to your HTML file

// Initialize server state
let serverState: ServerState = initServerState(GAME_MAP);

const clients = new Set<WebSocket>();
const server = Deno.listen({ port: PORT });
console.log(`HTTP and WebSocket server running on http://localhost:${PORT}/`);

// Helper function to read the HTML file
async function fetchHtml(filePath: string): Promise<string> {
  try {
    return await Deno.readTextFile(filePath);
  } catch (error) {
    console.error("Error reading HTML file:", error);
    return "Error loading page";
  }
}

// Broadcast state to all WebSocket clients
function broadcastState(clients: Set<WebSocket>) {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "state-update",
          state: serverState,
        })
      );
    }
  }
}

// Game loop
setInterval(() => {
  // Process commands and update the state
  serverState = processCommandQueue(serverState);
  serverState = processTick(serverState);

  // Broadcast the updated state to all clients
  broadcastState(clients);
}, TICK_INTERVAL);

for await (const conn of server) {
  handleConn(conn);
}

async function handleConn(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const requestEvent of httpConn) {
    const { pathname } = new URL(requestEvent.request.url);
    console.log(`Request for ${pathname}`);

    if (pathname === "/" || pathname === "/index.html") {
      // Serve the HTML page for root or specified path
      const htmlContent = await fetchHtml(HTML_PATH);
      requestEvent.respondWith(
        new Response(htmlContent, {
          headers: { "Content-Type": "text/html" },
        })
      );
    } else if (pathname === "/ws") {
      // Handling WebSocket connections
      const { socket, response } = Deno.upgradeWebSocket(requestEvent.request);
      clients.add(socket);
      socket.onopen = () => console.log("Client connected");
      socket.onmessage = (event) => {
        console.log("Received message:", event.data);
        try {
          const command: ServerCommand = JSON.parse(event.data);
          serverState.commandQueue.push(command);
        } catch (error) {
          console.error("Failed to parse command:", error);
        }
      };
      socket.onclose = () => {
        console.log("Client disconnected");
        clients.delete(socket);
      };
      socket.onerror = (event) => console.error("WebSocket error:", event);
      requestEvent.respondWith(response);
    } else {
      // Return 404 for other paths
      requestEvent.respondWith(new Response("Not Found", { status: 404 }));
    }
  }
}
