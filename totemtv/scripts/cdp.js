// Tiny Chrome DevTools Protocol client: evaluates an expression in the live
// TotemTV WebView and prints the result. Usage: node scripts/cdp.js "<jsExpr>"
const WS = 'ws://localhost:9222/devtools/page/' + process.argv[3];
const expr = process.argv[2];
const ws = new WebSocket(WS);
let id = 0;
const pending = {};
function send(method, params) {
  return new Promise((resolve) => { const myId = ++id; pending[myId] = resolve; ws.send(JSON.stringify({ id: myId, method, params })); });
}
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }
};
ws.onopen = async () => {
  await send('Runtime.enable', {});
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) console.log('EXCEPTION', JSON.stringify(r.result.exceptionDetails));
  console.log(JSON.stringify(r.result ? r.result.result && r.result.result.value : r, null, 0));
  ws.close();
};
ws.onerror = (e) => { console.log('WS ERROR', e.message || e); process.exit(1); };
