import {
  GAME_MAP,
  PLAYER_SPAWN_POSITION,
  PlayerInfo,
  ServerCommand,
  ServerState,
} from "./core.ts";
import {
  createToken,
  hashPassword,
  verifyPassword,
  verifyToken,
} from "./auth.ts";
import {
  genUUID,
  initServerState,
  processCommandQueue,
  processTick,
} from "./game-logic.ts";

// Globals
type DBUser = {
  passwordHash: string;
  passwordSalt: string;
};
const users = new Map<string, DBUser>();

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

// Broadciast state to all WebSocket clients
function broadcastState(clients: Set<WebSocket>) {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "set-state",
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

    if (pathname === "/client.js") {
      // Serve the client-side JavaScript file
      const jsContent = await Deno.readTextFile("./client.js");
      requestEvent.respondWith(
        new Response(jsContent, {
          headers: { "Content-Type": "application/javascript" },
        })
      );
    } else if (pathname === "/" || pathname === "/index.html") {
      // Serve the HTML page for root or specified path
      const htmlContent = await fetchHtml(HTML_PATH);
      requestEvent.respondWith(
        new Response(htmlContent, {
          headers: { "Content-Type": "text/html" },
        })
      );
    } else if (pathname === "/ws") {
      const requestURL = new URL(requestEvent.request.url);
      const token = requestURL.searchParams.get("token");
      console.log("Token:", token);
      const jwtToken = await verifyToken((token || "").trim());

      if (!jwtToken) {
        requestEvent.respondWith(new Response("Unauthorized", { status: 401 }));
        return;
      }

      const username = jwtToken.username;

      const { socket, response } = Deno.upgradeWebSocket(requestEvent.request);
      clients.add(socket);
      socket.onopen = () => {
        serverState.players[username] = {
          hp: 10,
          mp: 10,
          id: username,
          inventory: [
            {
              id: genUUID(),
              iid: "HP_POT_1",
            },
            {
              id: genUUID(),
              iid: "RUSTY_SWORD",
            },
          ],
          name: username,
          position: PLAYER_SPAWN_POSITION,
          skills: {
            strength: 0,
            attack: 0,
            defense: 0,
            magic: 0,
          },
          state: { type: "idle" },
        };
        console.log("Client connected");
      };
      socket.onmessage = (event) => {
        console.log("Received message:", event.data);
        try {
          const command: ServerCommand = JSON.parse(event.data);
          // @ts-ignore
          command.senderId = username;
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
    } else if (pathname === "/signup") {
      requestEvent.respondWith(await handleSignup(requestEvent.request));
    } else if (pathname === "/login") {
      requestEvent.respondWith(await handleLogin(requestEvent.request));
    } else {
      // Return 404 for other paths
      requestEvent.respondWith(new Response("Not Found", { status: 404 }));
    }
  }
}

async function handleSignup(request: Request): Promise<Response> {
  const formData = await request.formData();
  const username = formData.get("username")?.toString() || "";
  const password = formData.get("password")?.toString() || "";

  if (users.has(username)) {
    return new Response(JSON.stringify({ error: "User already exists" }), {
      status: 409,
    });
  }

  const passwordHash = hashPassword(password);
  users.set(username, {
    passwordHash: passwordHash[0],
    passwordSalt: passwordHash[1],
  });

  const newPlayer: PlayerInfo = {
    hp: 10,
    mp: 10,
    id: username,
    inventory: [
      {
        id: genUUID(),
        iid: "HP_POT_1",
      },
      {
        id: genUUID(),
        iid: "RUSTY_SWORD",
      },
    ],
    name: username,
    position: PLAYER_SPAWN_POSITION,
    skills: {
      strength: 0,
      attack: 0,
      defense: 0,
      magic: 0,
    },
    state: { type: "idle" },
  };

  serverState.players[username] = newPlayer;
  return new Response(JSON.stringify({ message: "User created" }), {
    status: 201,
  });
}

async function handleLogin(request: Request): Promise<Response> {
  const formData = await request.formData();
  const username = formData.get("username")?.toString() || "";
  const password = formData.get("password")?.toString() || "";

  const user = users.get(username);
  if (
    !user ||
    !verifyPassword(password, user.passwordHash, user.passwordSalt)
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid username or password" }),
      { status: 401 }
    );
  }

  const token = await createToken(username);
  return new Response(JSON.stringify({ token }), { status: 200 });
}
