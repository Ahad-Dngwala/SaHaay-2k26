class NotificationService {
  constructor() {
    this.listeners = {};
  }

  showNotification(title, message, type = 'info') {
    // Implementation for showing notifications
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
  }

  showAlert(title, message) {
    this.showNotification(title, message, 'alert');
  }

  showSuccess(title, message) {
    this.showNotification(title, message, 'success');
  }

  showError(title, message) {
    this.showNotification(title, message, 'error');
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
}

export default new NotificationService();
