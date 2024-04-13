const CLIENT_STATE = {};

document.addEventListener("DOMContentLoaded", () => {
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
    // WebSocket logic remains the same
    const serverUrl = `ws://localhost:8080/ws?token=${CLIENT_STATE.token}`;
    const ws = new WebSocket(serverUrl);

    ws.onopen = () => {
      console.log("Connected to the server");

      // Example command to send to the server
      const command = JSON.stringify({
        type: "connect",
      });
      ws.send(command);
    };

    ws.onmessage = (event) => {
      console.log("Message from server:", event.data);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = (event) => {
      console.log("Disconnected from server", event.reason);
    };
  }
});
