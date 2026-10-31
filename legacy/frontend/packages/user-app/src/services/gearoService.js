// Gearo vibration sensor service - SIMULATED ACCELEROMETER
class GearoSensor {
  constructor() {
    this.isActive = false;
    this.vibrationLevel = 0;
    this.listeners = [];
  }

  start(callback) {
    this.isActive = true;
    this.interval = setInterval(() => {
      // Simulate real accelerometer data (g-force)
      this.vibrationLevel = 1.2 + Math.sin(Date.now() * 0.005) * 0.8 + 
                           (Math.random() - 0.5) * 0.6;
      callback(this.vibrationLevel);
    }, 100); // 10Hz sampling rate
  }

  stop() {
    this.isActive = false;
    if (this.interval) clearInterval(this.interval);
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  getStatus(level) {
    if (level < 1.5) return 'SAFE';
    if (level < 2.0) return 'BUMP';
    if (level < 2.5) return 'WARNING';
    return '🚨 ACCIDENT';
  }
}

export default new GearoSensor();
