const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from "public"
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket signaling logic
io.on('connection', socket => {
  socket.on('create', room => {
    socket.join(room);
  });

  socket.on('join', room => {
    socket.join(room);
    socket.to(room).emit('joined');
  });

  socket.on('offer', data => socket.to(data.room).emit('offer', data));
  socket.on('answer', data => socket.to(data.room).emit('answer', data));
  socket.on('ice', data => socket.to(data.room).emit('ice', data));
});

// Use Render's provided port
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
