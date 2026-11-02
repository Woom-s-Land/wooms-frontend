export class NettyClient {
  constructor({
    url,
    reconnectDelay = 5000,
    heartbeatInterval = 10000,
    WebSocketImpl = globalThis.WebSocket,
  }) {
    if (!url) throw new Error('Netty WebSocket URL is required');
    if (!WebSocketImpl) throw new Error('WebSocket is unavailable');
    this.url = url;
    this.reconnectDelay = reconnectDelay;
    this.heartbeatInterval = heartbeatInterval;
    this.WebSocketImpl = WebSocketImpl;
    this.active = false;
    this.connected = false;
    this.onConnect = undefined;
    this.onDisconnect = undefined;
    this.onWebSocketError = undefined;
    this.onStompError = undefined;
    this.socket = null;
    this.generation = 0;
    this.subscriptions = new Map();
    this.nextSubscriptionId = 1;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.deactivation = Promise.resolve();
    this.lastActivity = 0;
  }

  async activate() {
    if (this.active) return;
    this.active = true;
    const generation = ++this.generation;
    await this.deactivation;
    if (!this.active || generation !== this.generation) return;
    this._connect(generation);
  }

  async deactivate() {
    this.active = false;
    ++this.generation;
    this._clearTimers();
    this.subscriptions.clear();
    const socket = this.socket;
    this.socket = null;
    this.connected = false;
    if (!socket) {
      this.deactivation = Promise.resolve();
      return this.deactivation;
    }
    this.deactivation = new Promise((resolve) => {
      if (socket.readyState === this.WebSocketImpl.CLOSED) return resolve();
      const done = () => { clearTimeout(timer); resolve(); };
      const timer = setTimeout(done, 3000);
      socket.addEventListener?.('close', done, { once: true });
      try {
        socket.close(1000, 'client deactivated');
      } catch {
        resolve();
      }
      if (socket.readyState === this.WebSocketImpl.CLOSED) resolve();
    });
    return this.deactivation;
  }

  subscribe(destination, callback) {
    if (!destination || typeof callback !== 'function') {
      throw new TypeError('destination and callback are required');
    }
    const id = `netty-sub-${this.nextSubscriptionId++}`;
    const subscription = { id, destination, callback, removed: false };
    this.subscriptions.set(id, subscription);
    if (this.connected) this._send({ op: 'SUBSCRIBE', id, destination });
    return {
      id,
      unsubscribe: () => {
        if (subscription.removed) return;
        subscription.removed = true;
        this.subscriptions.delete(id);
        if (this.connected) this._send({ op: 'UNSUBSCRIBE', id });
      },
    };
  }

  publish({ destination, body }) {
    if (!this.connected || !this.socket || this.socket.readyState !== this.WebSocketImpl.OPEN) {
      throw new Error('Netty WebSocket is not connected');
    }
    if (typeof body !== 'string') throw new TypeError('publish body must be a string');
    this._send({ op: 'SEND', destination, body });
  }

  _connect(generation) {
    if (!this.active || generation !== this.generation) return;
    let socket;
    try {
      socket = new this.WebSocketImpl(this.url);
    } catch (error) {
      this.onWebSocketError?.({ error });
      this._scheduleReconnect(generation);
      return;
    }
    this.socket = socket;
    socket.addEventListener('open', () => {
      if (!this._current(socket, generation)) return socket.close();
      this.lastActivity = Date.now();
    });
    socket.addEventListener('message', (event) => {
      if (!this._current(socket, generation)) return;
      this.lastActivity = Date.now();
      this._receive(event.data, socket, generation);
    });
    socket.addEventListener('error', (event) => {
      if (this._current(socket, generation)) this.onWebSocketError?.(event);
    });
    socket.addEventListener('close', (event) => {
      if (!this._current(socket, generation)) return;
      this.connected = false;
      this._clearHeartbeat();
      this.socket = null;
      this.onDisconnect?.(event);
      this._scheduleReconnect(generation);
    });
  }

  _receive(raw, socket, generation) {
    let message;
    try {
      message = JSON.parse(typeof raw === 'string' ? raw : String(raw));
    } catch {
      this.onStompError?.({ headers: { message: 'invalid server message' }, body: 'invalid server message' });
      return;
    }
    switch (message.op) {
      case 'CONNECTED':
        if (this.connected) return;
        this.connected = true;
        for (const sub of this.subscriptions.values()) {
          if (!sub.removed) this._send({ op: 'SUBSCRIBE', id: sub.id, destination: sub.destination });
        }
        this._startHeartbeat(socket, generation);
        this.onConnect?.({ headers: { transport: 'netty' } });
        break;
      case 'MESSAGE': {
        const sub = this.subscriptions.get(message.subscription);
        if (sub && !sub.removed) {
          sub.callback({ body: typeof message.body === 'string' ? message.body : JSON.stringify(message.body),
            headers: { destination: message.destination } });
        }
        break;
      }
      case 'ERROR': {
        const text = String(message.message ?? 'server error');
        this.onStompError?.({ headers: { message: text }, body: text });
        break;
      }
      case 'PONG':
        this.lastActivity = Date.now();
        break;
      default:
        this.onStompError?.({ headers: { message: 'unknown server operation' }, body: 'unknown server operation' });
    }
  }

  _startHeartbeat(socket, generation) {
    this._clearHeartbeat();
    const interval = this.heartbeatInterval;
    this.heartbeatTimer = setInterval(() => {
      if (!this._current(socket, generation) || !this.connected) return;
      if (Date.now() - this.lastActivity > interval * 3) {
        socket.close(4000, 'heartbeat timeout');
        return;
      }
      this._send({ op: 'PING' });
    }, interval);
  }

  _scheduleReconnect(generation) {
    this._clearHeartbeat();
    if (!this.active || generation !== this.generation || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.active && generation === this.generation) this._connect(generation);
    }, this.reconnectDelay);
  }

  _send(envelope) {
    if (!this.socket || this.socket.readyState !== this.WebSocketImpl.OPEN) return false;
    this.socket.send(JSON.stringify(envelope));
    return true;
  }

  _current(socket, generation) {
    return this.active && generation === this.generation && this.socket === socket;
  }

  _clearHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  _clearTimers() {
    this._clearHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
