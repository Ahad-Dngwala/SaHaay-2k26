/**
 * src/core/crash/CountdownTimer.ts
 *
 * Safety countdown timer that gates emergency SOS transmission after crash detection.
 * Defaults to Config.COUNTDOWN_SEC (30s), configurable between COUNTDOWN_MIN and COUNTDOWN_MAX.
 *
 * Guarantees:
 * - Emits onTick(remainingSec) every second.
 * - If cancel() is called, onExpire() will NEVER fire.
 * - If countdown completes, onExpire() fires EXACTLY ONCE.
 */

import { Config } from '../config';

export interface CountdownTimerOptions {
  durationSec?: number;
  onTick?: (remainingSec: number) => void;
  onExpire?: () => void;
  onCancel?: () => void;
}

export class CountdownTimer {
  private durationSec: number;
  private remainingSec: number;
  private timerId: NodeJS.Timeout | null = null;
  private running = false;
  private expired = false;
  private cancelled = false;

  private readonly onTick?: (remainingSec: number) => void;
  private readonly onExpire?: () => void;
  private readonly onCancel?: () => void;

  constructor(options: CountdownTimerOptions = {}) {
    const rawDuration = options.durationSec ?? Config.COUNTDOWN_SEC;
    this.durationSec = Math.max(Config.COUNTDOWN_MIN, Math.min(Config.COUNTDOWN_MAX, rawDuration));
    this.remainingSec = this.durationSec;
    this.onTick = options.onTick;
    this.onExpire = options.onExpire;
    this.onCancel = options.onCancel;
  }

  /** Starts the countdown. */
  start(): void {
    if (this.running || this.expired || this.cancelled) return;

    this.running = true;
    this.onTick?.(this.remainingSec);

    this.timerId = setInterval(() => {
      this.remainingSec -= 1;
      this.onTick?.(this.remainingSec);

      if (this.remainingSec <= 0) {
        this.clearTimer();
        this.running = false;
        this.expired = true;
        this.onExpire?.();
      }
    }, 1000);
  }

  /** Cancels the countdown. Guarantees onExpire will never fire. */
  cancel(): void {
    if (this.expired || this.cancelled) return;

    this.clearTimer();
    this.running = false;
    this.cancelled = true;
    this.onCancel?.();
  }

  /** Demo Director override: adjust duration within allowed bounds. */
  overrideDuration(sec: number): void {
    if (this.running) {
      throw new Error('Cannot override duration while countdown is running');
    }
    this.durationSec = Math.max(Config.COUNTDOWN_MIN, Math.min(Config.COUNTDOWN_MAX, sec));
    this.remainingSec = this.durationSec;
  }

  getRemainingSec(): number {
    return this.remainingSec;
  }

  getDurationSec(): number {
    return this.durationSec;
  }

  isRunning(): boolean {
    return this.running;
  }

  isExpired(): boolean {
    return this.expired;
  }

  isCancelled(): boolean {
    return this.cancelled;
  }

  reset(): void {
    this.clearTimer();
    this.remainingSec = this.durationSec;
    this.running = false;
    this.expired = false;
    this.cancelled = false;
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
