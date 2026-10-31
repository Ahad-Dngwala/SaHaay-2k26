/**
 * mobile-app/src/services/crashService.ts
 * Browser & mobile crash detection simulator implementing the exact logic
 * from src/core/crash/CrashDetector.ts and CountdownTimer.ts.
 */

import { Config } from '../config';

export type CrashStatus = 'IDLE' | 'IMPACT_DETECTED' | 'COUNTDOWN_ACTIVE' | 'DISPATCHED' | 'CANCELLED';

export interface CrashState {
  status: CrashStatus;
  secondsRemaining: number;
  impactG: number;
  impactTime: number | null;
}

type CrashListener = (state: CrashState) => void;

class CrashService {
  private status: CrashStatus = 'IDLE';
  private secondsRemaining: number = Config.COUNTDOWN_SEC;
  private impactG: number = 0;
  private impactTime: number | null = null;
  private timerId: any = null;
  private listeners: Set<CrashListener> = new Set();
  private onDispatchCallback?: () => void;

  getState(): CrashState {
    return {
      status: this.status,
      secondsRemaining: this.secondsRemaining,
      impactG: this.impactG,
      impactTime: this.impactTime,
    };
  }

  subscribe(listener: CrashListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  setDispatchCallback(cb: () => void) {
    this.onDispatchCallback = cb;
  }

  /**
   * Simulate or receive a high-G impact (e.g. 2.8g).
   * Passes through stillness check window, then starts the 30s countdown.
   */
  triggerImpact(magnitudeG: number = 2.8) {
    if (this.status === 'COUNTDOWN_ACTIVE' || this.status === 'DISPATCHED') {
      return; // Already handling
    }

    if (magnitudeG < Config.CRASH_G) {
      return; // Below threshold (pothole or regular driving)
    }

    this.impactG = magnitudeG;
    this.impactTime = Date.now();
    this.status = 'IMPACT_DETECTED';
    this.emit();

    // Stillness filter: wait STILLNESS_WINDOW_MS to confirm stillness
    setTimeout(() => {
      // Impact confirmed by stillness filter
      this.startCountdown();
    }, Config.STILLNESS_WINDOW_MS);
  }

  private startCountdown() {
    this.status = 'COUNTDOWN_ACTIVE';
    this.secondsRemaining = Config.COUNTDOWN_SEC;
    this.emit();

    if (this.timerId) clearInterval(this.timerId);

    this.timerId = setInterval(() => {
      this.secondsRemaining -= 1;
      if (this.secondsRemaining <= 0) {
        this.completeCountdown();
      } else {
        this.emit();
      }
    }, 1000);
  }

  /**
   * Cancel alert: user presses "I'm Safe — Cancel Alert"
   */
  cancelAlert(): boolean {
    if (this.status !== 'COUNTDOWN_ACTIVE' && this.status !== 'IMPACT_DETECTED') {
      return false;
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.status = 'CANCELLED';
    this.secondsRemaining = Config.COUNTDOWN_SEC;
    this.emit();

    setTimeout(() => {
      this.reset();
    }, 3000);
    return true;
  }

  /**
   * Countdown expired: trigger automatic SOS dispatch exactly once.
   */
  private completeCountdown() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.status = 'DISPATCHED';
    this.secondsRemaining = 0;
    this.emit();

    if (this.onDispatchCallback) {
      this.onDispatchCallback();
    }
  }

  /**
   * Reset back to IDLE
   */
  reset() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.status = 'IDLE';
    this.secondsRemaining = Config.COUNTDOWN_SEC;
    this.impactG = 0;
    this.impactTime = null;
    this.emit();
  }
}

export const crashService = new CrashService();

