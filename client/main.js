let socket = null;
let canvasEl, colorEl, widthEl, brushBtn, eraserBtn, undoBtn, redoBtn, clearBtn, joinBtn, roomIdEl, usernameEl, statusEl;

let currentTool = 'brush';

function setTool(t){ currentTool = t; }

function init(){
  canvasEl = document.getElementById('canvas');
  colorEl = document.getElementById('color');
  widthEl = document.getElementById('width');
  brushBtn = document.getElementById('brush');
  eraserBtn = document.getElementById('eraser');
  undoBtn = document.getElementById('undo');
  redoBtn = document.getElementById('redo');
  clearBtn = document.getElementById('clear');
  joinBtn = document.getElementById('join');
  roomIdEl = document.getElementById('roomId');
  usernameEl = document.getElementById('username');
  statusEl = document.getElementById('status');

  // disable controls until joined
  [colorEl, widthEl, brushBtn, eraserBtn, undoBtn, redoBtn, clearBtn].forEach(el=>el.classList.add('disabled'));

  CanvasApp.setup(canvasEl);
  // initialize canvas options from UI
  CanvasApp.setOptions({ color: colorEl.value, width: parseInt(widthEl.value, 10), tool: 'brush' });

  // button handlers (consolidated)
  function emitSafe(eventName, payload){
    if (!socket){
      console.warn('Socket not connected — cannot emit', eventName);
      return;
    }
    console.log('emit', eventName, payload || '');
    socket.emit(eventName, payload);
  }

  undoBtn.addEventListener('click', ()=> emitSafe('undo'));
  redoBtn.addEventListener('click', ()=> emitSafe('redo'));
  clearBtn.addEventListener('click', ()=> emitSafe('clear'));
  joinBtn.addEventListener('click', joinRoom);

  // wire color and width to canvas options
  colorEl.addEventListener('change', () => CanvasApp.setOptions({ color: colorEl.value }));
  widthEl.addEventListener('input', () => CanvasApp.setOptions({ width: parseInt(widthEl.value, 10) }));

  // brush / eraser with active class toggling
  brushBtn.addEventListener('click', () => {
    setTool('brush');
    CanvasApp.setOptions({ tool: 'brush' });
    brushBtn.classList.add('active');
    eraserBtn.classList.remove('active');
  });
  eraserBtn.addEventListener('click', () => {
    setTool('eraser');
    CanvasApp.setOptions({ tool: 'eraser' });
    eraserBtn.classList.add('active');
    brushBtn.classList.remove('active');
  });

  // set initial active state
  brushBtn.classList.add('active');
}

function joinRoom(){
  const roomId = roomIdEl.value.trim() || 'default';
  const username = usernameEl.value.trim() || 'Anon';
  socket = io();
  socket.emit('join', { roomId, username });

  socket.on('init', (data) => {
    console.log('init', data);
    CanvasApp.initState({ users: data.users, history: data.history });
    // enable controls now
    [colorEl, widthEl, brushBtn, eraserBtn, undoBtn, redoBtn, clearBtn].forEach(el=>el.classList.remove('disabled'));
    statusEl.textContent = `Connected: ${roomId}`;
    joinBtn.disabled = true;
  });
  // forward local stroke events to server
  CanvasApp.setOnLocalStroke((evt) => {
    if (!socket) return;
    // evt: { action: 'stroke', stroke }
    if (evt.action === 'stroke'){
      socket.emit('stroke', evt.stroke);
    }
  });
  socket.on('user-joined', (u) => { console.log('user joined', u); });

  socket.on('user-left', ({ userId }) => {
    console.log('user left', userId);
  });

  socket.on('stroke', ({ op }) => {
    console.log('received stroke', op && op.id);
    CanvasApp.applyOp(op);
  });

  socket.on('history', ({ history }) => {
    console.log('received history, entries=', (history||[]).length);
    CanvasApp.setHistory(history);
  });

  socket.on('cursor', ({ userId, cursor }) => {
    // TODO: show remote cursors
  });

  socket.on('undo', ({ opId }) => {
    console.log('received undo', opId);
    CanvasApp.undoOp(opId);
  });

  socket.on('redo', ({ op }) => {
    console.log('received redo', op && op.id);
    CanvasApp.redoOp(op);
  });

  socket.on('clear', () => { console.log('received clear'); CanvasApp.clearCanvas(); });
  
  // ping/pong for latency
  setInterval(()=>{
    if (!socket) return;
    const t0 = Date.now();
    socket.emit('ping-server', { t: t0 });
  }, 2000);

  socket.on('pong-server', ({ t }) => {
    const latency = Date.now() - t;
    const latEl = document.getElementById('latency'); if (latEl) latEl.textContent = String(latency);
  });

  // enable save/load buttons
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  saveBtn && saveBtn.addEventListener('click', ()=>{
    fetch(`/rooms/${roomId}/save`, { method:'POST' }).then(r=>r.json()).then(j=>alert(j.ok? 'Saved':'Save failed'));
  });
  loadBtn && loadBtn.addEventListener('click', ()=>{
    fetch(`/rooms/${roomId}/load`, { method:'POST' }).then(r=>r.json()).then(j=>{
      if (j.ok) alert('Loaded'); else alert('Load failed: '+ (j.error||'unknown'));
    });
  });
}

document.addEventListener('DOMContentLoaded', init);

// keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); socket && socket.emit('undo'); }
  if (e.key === 'y' || (e.key === 'Z' && e.shiftKey)) { e.preventDefault(); socket && socket.emit('redo'); }
});

// swatches and help overlay handlers
document.addEventListener('click', (e) => {
  const sw = e.target.closest('.swatch');
  if (sw){
    const c = sw.dataset.color;
    colorEl.value = c;
    CanvasApp.setOptions({ color: c });
  }
});

const helpBtn = document.getElementById('helpBtn');
const helpOverlay = document.getElementById('helpOverlay');
const closeHelp = document.getElementById('closeHelp');
if (helpBtn){
  helpBtn.addEventListener('click', ()=>{ helpOverlay.classList.remove('hidden'); });
}
if (closeHelp){ closeHelp.addEventListener('click', ()=>{ helpOverlay.classList.add('hidden'); }); }

// FPS counter
{ const fpsEl = document.getElementById('fps'); let last = performance.now(); let frames = 0; setInterval(()=>{ const now = performance.now(); const dt = now - last; const fps = Math.round((frames / dt)*1000); if (fpsEl) fpsEl.textContent = String(fps); last = now; frames = 0; }, 1000); function tick(){ frames++; requestAnimationFrame(tick); } requestAnimationFrame(tick); }
