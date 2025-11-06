const CanvasApp = (function(){
  let canvas, ctx;
  let drawing = false;
  let currentStroke = null;
  let users = {};
  let onLocalStroke = null; // callback
  let options = { color: '#000', width: 3, tool: 'brush' };

  function setup(c){
    canvas = c;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
  }

  function setOnLocalStroke(cb){ onLocalStroke = cb; }

  function setOptions(o){ options = { ...options, ...o }; }

  function resize(){
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    // reset transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  // state mirrors server history
  let history = [];

  function initState(init){
    history = (init.history || []).map(h => ({ id: h.id, type: h.type, payload: h.payload }));
    users = {};
    (init.users || []).forEach(u=> users[u.id]=u);
    redraw();
    renderUserList();
  }

  function setHistory(h){
    history = (h || []).map(x => ({ id: x.id, type: x.type, payload: x.payload }));
    redraw();
  }

  function onPointerDown(e){
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    currentStroke = { color: options.tool === 'eraser' ? '#fff' : options.color, width: options.width, points: [{x,y}] };
    // begin not sent separately; we'll send the completed stroke on pointerup
  }

  function onPointerMove(e){
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (drawing && currentStroke){
      currentStroke.points.push({x,y});
      // local immediate render
      drawStrokeSegment(currentStroke.color, currentStroke.width, currentStroke.points);
    }
    // cursor events handled by main
  }

  function onPointerUp(e){
    if (!drawing) return;
    drawing = false;
    // send full stroke to server
    onLocalStroke && onLocalStroke({ action: 'stroke', stroke: currentStroke });
    currentStroke = null;
  }

  function applyOp(op){
    if (op.type === 'stroke'){
      history.push(op);
      // naive: redraw whole canvas
      redraw();
    }
  }

  function undoOp(opId){
    // naive: pop last op
    history = history.slice(0, Math.max(0, history.length-1));
    redraw();
  }

  function redoOp(op){
    if (op) history.push(op);
    redraw();
  }

  function clearCanvas(){
    history = [];
    redraw();
  }

  function redraw(){
    if (!ctx || !canvas) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    history.forEach(entry => {
      if (entry.type === 'stroke'){
        const s = entry.payload;
        drawStrokePath(s.color, s.width, s.points);
      }
    });
  }

  function drawStrokePath(color, width, points){
    if (!points || points.length===0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function drawStrokeSegment(color, width, points){
    if (!points || points.length<2) return;
    // smoothing: use last 3 points to draw a quadratic curve
    const n = points.length;
    if (n >= 3){
      const p0 = points[n-3];
      const p1 = points[n-2];
      const p2 = points[n-1];
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      // quadratic curve through p1 to p2
      ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
      return;
    }
    drawStrokePath(color, width, points.slice(-2));
  }

  function renderUserList(){
    const el = document.getElementById('users');
    if (!el) return;
    el.innerHTML = '';
    Object.values(users).forEach(u => {
      const d = document.createElement('div'); d.className='user-item';
      const s = document.createElement('div'); s.className='user-swatch'; s.style.background = u.color;
      d.appendChild(s);
      d.appendChild(document.createTextNode(u.name));
      el.appendChild(d);
    });
  }

  return { setup, setOnLocalStroke, setOptions, initState, setHistory, applyOp, undoOp, redoOp, clearCanvas, renderUserList };
})();
