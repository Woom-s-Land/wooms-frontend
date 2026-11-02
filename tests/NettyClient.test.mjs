import test from 'node:test';
import assert from 'node:assert/strict';
import { NettyClient } from '../src/libs/socket/NettyClient.js';

class FakeWebSocket extends EventTarget {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  static instances = [];
  constructor(url) { super(); this.url=url; this.readyState=0; this.sent=[]; FakeWebSocket.instances.push(this); }
  send(data) { if(this.readyState!==1) throw new Error('not open'); this.sent.push(JSON.parse(data)); }
  open() { this.readyState=1; this.dispatchEvent(new Event('open')); }
  server(data) { this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(data)})); }
  close(code=1000,reason='') { this.readyState=2; this.closeArgs=[code,reason]; }
  finishClose() { this.readyState=3; const event=new Event('close'); Object.defineProperty(event,'code',{value:1000}); this.dispatchEvent(event); }
}
function make(options={}) { FakeWebSocket.instances=[]; return new NettyClient({url:'ws://test/ws',reconnectDelay:5,heartbeatInterval:60000,WebSocketImpl:FakeWebSocket,...options}); }
async function turn() { await new Promise(r=>setImmediate(r)); }
async function connected(client,socket) { await client.activate(); await turn(); socket.open(); socket.server({op:'CONNECTED'}); }

test('simultaneous activate opens one socket', async()=>{const c=make();await Promise.all([c.activate(),c.activate()]);assert.equal(FakeWebSocket.instances.length,1);await c.deactivate();});
test('deactivate immediately after activate prevents socket creation', async()=>{const c=make();const a=c.activate();await c.deactivate();await a;assert.equal(FakeWebSocket.instances.length,0);});
test('activate during deactivation waits for old socket close', async()=>{const c=make();await c.activate();const old=FakeWebSocket.instances[0];const d=c.deactivate();const a=c.activate();await turn();assert.equal(FakeWebSocket.instances.length,1);old.finishClose();await Promise.all([d,a]);assert.equal(FakeWebSocket.instances.length,2);await c.deactivate();FakeWebSocket.instances[1].finishClose();});
test('unexpected close reconnects and restores subscriptions; old generation ignored', async()=>{const c=make();let calls=0;const sub=c.subscribe('/topic',()=>calls++);const activation=c.activate();await turn();const old=FakeWebSocket.instances[0];old.open();old.server({op:'CONNECTED'});await activation;old.finishClose();await new Promise(r=>setTimeout(r,15));const current=FakeWebSocket.instances.at(-1);current.open();current.server({op:'CONNECTED'});assert.ok(current.sent.some(x=>x.op==='SUBSCRIBE'&&x.id===sub.id));old.server({op:'MESSAGE',subscription:sub.id,body:'{}'});assert.equal(calls,0);const deactivation=c.deactivate();current.finishClose();await deactivation;});
test('unsubscribe suppresses MESSAGE callbacks', async()=>{const c=make();let calls=0;const sub=c.subscribe('/topic',()=>calls++);const activation=c.activate();await turn();const socket=FakeWebSocket.instances[0];socket.open();socket.server({op:'CONNECTED'});await activation;sub.unsubscribe();socket.server({op:'MESSAGE',subscription:sub.id,body:'{}'});assert.equal(calls,0);const deactivation=c.deactivate();socket.finishClose();await deactivation;});
test('server ERROR maps to onStompError', async()=>{const c=make();let error;c.onStompError=e=>error=e;const activation=c.activate();await turn();const socket=FakeWebSocket.instances[0];socket.open();socket.server({op:'CONNECTED'});await activation;socket.server({op:'ERROR',message:'denied'});assert.deepEqual(error,{headers:{message:'denied'},body:'denied'});const deactivation=c.deactivate();socket.finishClose();await deactivation;});
test('publish while disconnected throws',()=>{const c=make();assert.throws(()=>c.publish({destination:'/x',body:'{}'}),/not connected/);});
