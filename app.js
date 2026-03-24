const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const mongoose = require('mongoose');

// 🌐 Connect MongoDB
mongoose.connect(process.env.MONGO_URL || "YOUR_MONGO_URL")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log(err));

// 📦 Message schema
const Message = mongoose.model('Message', {
  user: String,
  text: String,
  time: Date
});

// 🌐 Create HTTP server
const server = http.createServer((req, res) => {
  fs.readFile(__dirname + '/index.html', (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end("Error loading page");
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

// 🔌 WebSocket server
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on('connection', async (ws) => {
  console.log("👤 User connected");
  clients.push(ws);

  // 📤 Send old messages to new user
  const oldMessages = await Message.find().sort({ time: 1 }).limit(50);
  oldMessages.forEach(msg => {
    ws.send(`${msg.user}: ${msg.text}`);
  });

  // 📩 When message received
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      // 💾 Save to DB
      await Message.create({
        user: data.user,
        text: data.text,
        time: new Date()
      });

      const formatted = `${data.user}: ${data.text}`;

      // 📡 Broadcast
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(formatted);
        }
      });

    } catch (err) {
      console.log("❌ Error:", err);
    }
  });

  // ❌ On disconnect
  ws.on('close', () => {
    console.log("❌ User disconnected");
    clients = clients.filter(c => c !== ws);
  });
});

// 🚀 Start server (Render compatible)
const PORT = process.env.PORT || 8080;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
