const CLIENT_STATE = {
  ws: null,
  serverState: null,
};
let $gameBoard;
let $tileElements = {};

const BOARD_WIDTH = 32;
const BOARD_HEIGHT = 32;

function initGameBoardHtml() {
  if (!$gameBoard) {
    console.error("Game board element is not found.");
    return;
  }

  $gameBoard.innerHTML = "";
  const boardSize = $gameBoard.parentNode.getBoundingClientRect();
  let sz = Math.min(boardSize.width, boardSize.height) / BOARD_WIDTH;
  $gameBoard.style.width = `${sz * BOARD_WIDTH}px`;
  $gameBoard.style.height = `${sz * BOARD_HEIGHT}px`;
  $gameBoard.style.display = "grid";
  $gameBoard.style.gridTemplateColumns = `repeat(${BOARD_WIDTH}, ${sz}px)`;

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const tileKey = `${x},${y}`;
      const tile = document.createElement("div");
      tile.style.width = `${sz}px`;
      tile.style.height = `${sz}px`;
      tile.style.borderLeft = "1px solid rgba(0,0,0,0.1)";
      tile.style.borderTop = "1px solid rgba(0,0,0,0.1)";
      tile.style.boxSizing = "border-box";
      $gameBoard.appendChild(tile);
      $tileElements[tileKey] = tile;
    }
  }
}

function updateGameBoardHtml() {
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const tileKey = `${x},${y}`;
      const $tile = $tileElements[tileKey];

      // Access tile information from the server state
      const tileInfo = CLIENT_STATE.serverState?.map[tileKey];
      if (tileInfo) {
        // Display NPCs if any
        tileInfo.npcs.forEach((npc) => {
          const npcElement = document.createElement("span");
          npcElement.textContent = "👾"; // Simple icon for NPC
          npcElement.title = npc.npcId; // Tooltip showing the NPC ID
          $tile.appendChild(npcElement);
        });

        // Display items if any
        tileInfo.items.forEach((item) => {
          const itemElement = document.createElement("span");
          itemElement.textContent = "✨"; // Simple icon for items
          itemElement.title = item.id; // Tooltip showing the item ID
          $tile.appendChild(itemElement);
        });
      }

      // Set class for different types of tiles if needed
      if (CLIENT_STATE.serverState?.mapConfig.tiles[tileKey]?.isSolid) {
        $tile.style.backgroundColor = "#888"; // Indicate solid tiles
      }
    }
  }

  for (const npcId in CLIENT_STATE.serverState.npcs) {
    const npc = CLIENT_STATE.serverState.npcs[npcId];
    const $tile = $tileElements[`${npc.position[0]},${npc.position[1]}`];
    if (!$tile) continue;
    const npcElement = document.createElement("span");
    npcElement.textContent = "👾"; // Simple icon for NPC
    npcElement.title = npc.id; // Tooltip showing the NPC ID
    $tile.innerHTML = ""; // Clear the tile before adding the NPC
    $tile.appendChild(npcElement);
  }

  for (const playerId in CLIENT_STATE.serverState.players) {
    const player = CLIENT_STATE.serverState.players[playerId];
    const $tile = $tileElements[`${player.position[0]},${player.position[1]}`];
    if (!$tile) continue;
    const playerElement = document.createElement("span");
    playerElement.textContent = "👤"; // Simple icon for playe
    playerElement.title = player.id; // Tooltip showing the player ID
    $tile.innerHTML = ""; // Clear the tile before adding the player
    $tile.appendChild(playerElement);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $gameBoard = document.getElementById("game-board");
  initGameBoardHtml();

  const loginModal = document.getElementById("loginModal");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const showLoginBtn = document.getElementById("showLogin");
  const showSignupBtn = document.getElementById("showSignup");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");

  showLoginBtn.onclick = () => {
    showLoginBtn.style.color = "blue";
    showSignupBtn.style.color = "black";
    signupForm.style.display = "none";
    loginForm.style.display = "block";
  };

  showSignupBtn.onclick = () => {
    showLoginBtn.style.color = "black";
    showSignupBtn.style.color = "blue";
    loginForm.style.display = "none";
    signupForm.style.display = "block";
  };

  //   if (localStorage.getItem("ldjamtoken")) {
  //     CLIENT_STATE.token = localStorage.getItem("ldjamtoken");
  //     loginModal.style.display = "none"; // Hide login modal
  //     initializeWebSocket();
  //   }

  loginBtn.addEventListener("click", async () => {
    const username = usernameInput.value;
    const password = passwordInput.value;
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `username=${encodeURIComponent(
        username
      )}&password=${encodeURIComponent(password)}`,
    });

    if (response.ok) {
      const data = await response.json();
      CLIENT_STATE.token = data.token;
      localStorage.setItem("ldjamtoken", data.token);
      loginModal.style.display = "none"; // Hide login modal
      initializeWebSocket(); // Initialize WebSocket connection after login
    } else {
      alert("Login failed! Please check your credentials.");
    }
  });

  signupBtn.addEventListener("click", async () => {
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;
    const repeatPassword = document.getElementById("repeatPassword").value;

    if (password !== repeatPassword) {
      console.log(password, repeatPassword);
      alert("Passwords do not match!");
      return;
    }

    const response = await fetch("/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `username=${encodeURIComponent(
        username
      )}&password=${encodeURIComponent(password)}`,
    });

    if (response.ok) {
      const data = await response.json();
      alert("Signup successful! You can now log in.");
      showLoginBtn.click(); // Switch to login form after signup
    } else {
      alert("Signup failed! Username might already be taken.");
    }
  });

  function initializeWebSocket() {
    const serverUrl = `ws://localhost:8080/ws?token=${CLIENT_STATE.token}`;
    const ws = new WebSocket(serverUrl);

    ws.onopen = () => {
      console.log("Connected to the server");

      const command = JSON.stringify({
        type: "connect",
      });
      ws.send(command);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "set-state") {
        CLIENT_STATE.serverState = msg.state;
        console.log("Received server state", CLIENT_STATE.serverState);
        updateGameBoardHtml();
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = (event) => {
      console.log("Disconnected from server", event.reason);
    };
  }
});
