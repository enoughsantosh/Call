const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

// WebSocket signaling logic
io.on('connection', socket => {
  socket.on('create', room => {
    socket.join(room);
    socket.emit('created', room);
  });

  socket.on('join', room => {
    const clients = io.sockets.adapter.rooms.get(room);
    if (clients && clients.size >= 2) {
      socket.emit('full', room);
    } else {
      socket.join(room);
      socket.emit('joined', room);
      socket.to(room).emit('ready'); // let the other peer know
    }
  });

  socket.on('offer', data => socket.to(data.room).emit('offer', data));
  socket.on('answer', data => socket.to(data.room).emit('answer', data));
  socket.on('ice', data => socket.to(data.room).emit('ice', data));

  socket.on('disconnect', () => {
    // Optional: handle user disconnection
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
