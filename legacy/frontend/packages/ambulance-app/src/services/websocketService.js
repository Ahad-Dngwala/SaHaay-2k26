class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = {};
    this.messageQueue = [];
    this.isConnected = false;
  }

  connect(url) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.isConnected = true;
          console.log('WebSocket connected');
          this.flushQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('WebSocket disconnected');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(type, data) {
    const message = JSON.stringify({ type, payload: data });
    if (this.isConnected && this.ws) {
      this.ws.send(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  flushQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (this.ws) {
        this.ws.send(message);
      }
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export default new WebSocketService();
