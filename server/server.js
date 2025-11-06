const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { RoomManager } = require('./rooms');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'client')));

const rooms = new RoomManager();

const fs = require('fs');
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

app.use(express.json({ limit: '5mb' }));

// Persistence endpoints
app.post('/rooms/:id/save', (req, res) => {
  const id = req.params.id || 'default';
  const room = rooms.getOrCreateRoom(id);
  const file = path.join(storageDir, `${id}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify({ history: room.getHistory(), users: room.getUsers() }, null, 2));
    return res.json({ ok: true, file });
  } catch (err) {
    console.error('save error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/rooms/:id/load', (req, res) => {
  const id = req.params.id || 'default';
  const file = path.join(storageDir, `${id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ ok: false, error: 'no saved session' });
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    const room = rooms.getOrCreateRoom(id);
    // replace server history and broadcast
    room.history = (data.history || []).slice();
    room.redoStack = [];
    io.to(id).emit('history', { history: room.getHistory() });
    return res.json({ ok: true, loaded: file });
  } catch (err) {
    console.error('load error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join', ({roomId, username}) => {
    const room = rooms.getOrCreateRoom(roomId);
    socket.join(roomId);
    const user = room.addUser(socket.id, username);
    console.log(`user join: ${socket.id} -> room ${roomId} (${username})`);

    // send current state and users
    socket.emit('init', { users: room.getUsers(), history: room.getHistory() });
    socket.to(roomId).emit('user-joined', user);

    socket.data.roomId = roomId;
    socket.data.username = username;
  });

  socket.on('stroke', (data) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.getOrCreateRoom(roomId);
    // normalize payload
    const payload = typeof data === 'object' ? data : { raw: data };
    const op = room.pushOperation({ type: 'stroke', userId: socket.id, payload });
    console.log(`stroke from ${socket.id} in ${roomId} -> points=${(payload.points||[]).length}`);
    // broadcast the op and the updated history
    io.to(roomId).emit('stroke', { op });
    io.to(roomId).emit('history', { history: room.getHistory() });
  });

  socket.on('cursor', (data) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('cursor', { userId: socket.id, cursor: data });
  });

  socket.on('undo', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.getOrCreateRoom(roomId);
    const op = room.undo();
    if (op) {
      console.log(`undo in ${roomId} by ${socket.id} -> op ${op.id}`);
      io.to(roomId).emit('undo', { opId: op.id });
      io.to(roomId).emit('history', { history: room.getHistory() });
    }
  });

  socket.on('redo', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.getOrCreateRoom(roomId);
    const op = room.redo();
    if (op) {
      console.log(`redo in ${roomId} by ${socket.id} -> op ${op.id}`);
      io.to(roomId).emit('redo', { op });
      io.to(roomId).emit('history', { history: room.getHistory() });
    }
  });

  socket.on('clear', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.getOrCreateRoom(roomId);
    room.clear();
    console.log(`clear in ${roomId} by ${socket.id}`);
    io.to(roomId).emit('clear');
    io.to(roomId).emit('history', { history: room.getHistory() });
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      const room = rooms.getOrCreateRoom(roomId);
      room.removeUser(socket.id);
      socket.to(roomId).emit('user-left', { userId: socket.id });
    }
    console.log('socket disconnected', socket.id);
  });

  socket.on('ping-server', ({ t }) => {
    socket.emit('pong-server', { t });
  });
});

server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
