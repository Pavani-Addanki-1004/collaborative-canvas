const { v4: uuidv4 } = require('uuid');

class Room {
  constructor(id) {
    this.id = id;
    this.users = new Map(); // socketId -> {id, name, color}
    this.history = []; // operations
    this.redoStack = [];
  }

  addUser(socketId, name) {
    const color = this._assignColor();
    const user = { id: socketId, name: name || 'Anonymous', color };
    this.users.set(socketId, user);
    return user;
  }

  removeUser(socketId) {
    this.users.delete(socketId);
  }

  getUsers() {
    return Array.from(this.users.values());
  }

  pushOperation(op) {
    const entry = { id: uuidv4(), ts: Date.now(), ...op };
    this.history.push(entry);
    // clear redo stack on new operation
    this.redoStack = [];
    return entry;
  }

  getHistory() {
    return this.history.slice();
  }

  undo() {
    if (this.history.length === 0) return null;
    const op = this.history.pop();
    this.redoStack.push(op);
    return op;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const op = this.redoStack.pop();
    this.history.push(op);
    return op;
  }

  clear() {
    this.history = [];
    this.redoStack = [];
  }

  _assignColor() {
    // simple deterministic color assignment
    const palette = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#fabebe'];
    const idx = this.users.size % palette.length;
    return palette[idx];
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  getOrCreateRoom(id = 'default') {
    if (!this.rooms.has(id)) this.rooms.set(id, new Room(id));
    return this.rooms.get(id);
  }
}

module.exports = { RoomManager };
