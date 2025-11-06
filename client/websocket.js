const SocketClient = (function(){
  let socket = null;

  function connect() {
    socket = io();
    return socket;
  }

  function on(event, cb){ if (!socket) return; socket.on(event, cb); }
  function emit(event, payload){ if (!socket) return; socket.emit(event, payload); }

  return { connect, on, emit };
})();
