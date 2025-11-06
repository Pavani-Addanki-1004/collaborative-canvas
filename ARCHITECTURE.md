# Architecture

Overview

This project uses Socket.io for real-time events. Clients send drawing events (stroke begin/draw/end) to the server, which stores them as operations in a per-room history. The server broadcasts operations to all clients so everyone can render them.

WebSocket Protocol

- join: { roomId, username } -> client requests to join a room
- init: { users, history } -> server sends upon join
- stroke: { op } -> broadcasted operation with payload { type: 'stroke', payload: { color, width, points } }
- cursor: { userId, cursor } -> broadcasted cursor positions
- undo / redo / clear -> control messages

Undo/Redo Strategy

Server-side history: operations are appended with a UUID. Undo pops last operation and pushes it to redoStack. Redo pops from redoStack back to history. The server broadcasts undo/redo events. Clients maintain local history mirror and redraw entire canvas from history on change. This keeps global state consistent but is naive for large history sizes.

Conflict Resolution

We use an append-only operation log and deterministic redraw from the log. In case of overlapping operations, operations are applied in the order they were accepted by the server (causal order at the server). Undo removes the most recent operation, regardless of author. More advanced CRDT approaches are outside this minimal implementation.

Performance decisions

- Redraw-on-history-change: simple and robust. For production, use patching, layers or incremental diffing.
- Batching: not implemented. For high-frequency events, batch 'draw' points into fewer messages.
