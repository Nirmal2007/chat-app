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

// ✅ WebSocket server
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on('connection', (ws) => {
  console.log("✅ User connected");
  clients.push(ws);

  ws.on('message', (message) => {
    console.log("📩 Message:", message.toString());

    // Broadcast to all clients
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log("❌ User disconnected");
    clients = clients.filter(c => c !== ws);
  });
});

// Start server
server.listen(8080, '0.0.0.0', () => {
  console.log("🚀 Server running at http://localhost:8080");
});