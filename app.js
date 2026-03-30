const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

// Create HTTP server
const server = http.createServer((req, res) => {
  fs.readFile('index.html', (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end("Error loading page");
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Store users
let users = {}; // { username: ws }

function broadcastUsers() {
  const userList = Object.keys(users);

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "users",
        list: userList
      }));
    }
  });
}

wss.on('connection', (ws) => {
  console.log("✅ User connected");

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    // 🔹 Join
    if (data.type === "join") {
      ws.username = data.user;
      users[data.user] = ws;
      broadcastUsers();
    }

    // 🔹 Public message
    if (data.type === "message") {
      const payload = JSON.stringify({
        type: "message",
        user: data.user,
        text: data.text
      });

      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }

    // 🔹 Private message
    if (data.type === "private") {
      const target = users[data.to];

      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({
          type: "private",
          user: data.user,
          text: data.text
        }));
      }
    }

    // 🔹 Typing indicator
    if (data.type === "typing") {
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "typing",
            user: data.user
          }));
        }
      });
    }
  });

  ws.on('close', () => {
    console.log("❌ User disconnected");

    if (ws.username) {
      delete users[ws.username];
      broadcastUsers();
    }
  });
});

// Start server (Render compatible)
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});