/**
 * src/core/crash/CountdownTimer.test.ts
 * Tests for CountdownTimer: default 30s, cancellation, and exactly-once SOS trigger.
 */

import { CountdownTimer } from './CountdownTimer';
import { Config } from '../config';

describe('CountdownTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('defaults to Config.COUNTDOWN_SEC (30s)', () => {
    const timer = new CountdownTimer();
    expect(timer.getDurationSec()).toBe(Config.COUNTDOWN_SEC);
    expect(timer.getRemainingSec()).toBe(30);
  });

  test('Demo Director can override duration within [5, 30] bounds', () => {
    const timer = new CountdownTimer();
    timer.overrideDuration(10);
    expect(timer.getDurationSec()).toBe(10);
    expect(timer.getRemainingSec()).toBe(10);

    // Below min clamped to 5
    timer.overrideDuration(2);
    expect(timer.getDurationSec()).toBe(5);

    // Above max clamped to 30
    timer.overrideDuration(45);
    expect(timer.getDurationSec()).toBe(30);
  });

  test('cancellation prevents SOS from ever firing', () => {
    let expired = false;
    let cancelled = false;

    const timer = new CountdownTimer({
      onExpire: () => { expired = true; },
      onCancel: () => { cancelled = true; },
    });

    timer.start();
    expect(timer.isRunning()).toBe(true);

    // Advance 15 seconds
    jest.advanceTimersByTime(15000);
    expect(timer.getRemainingSec()).toBe(15);
    expect(expired).toBe(false);

    // User presses CANCEL
    timer.cancel();
    expect(timer.isCancelled()).toBe(true);
    expect(timer.isRunning()).toBe(false);
    expect(cancelled).toBe(true);

    // Advance past remaining time
    jest.advanceTimersByTime(20000);
    expect(expired).toBe(false); // MUST NEVER FIRE
  });

  test('completing countdown fires onExpire EXACTLY ONCE', () => {
    let expireCount = 0;
    const ticks: number[] = [];

    const timer = new CountdownTimer({
      onTick: (rem) => ticks.push(rem),
      onExpire: () => { expireCount++; },
    });

    timer.start();
    expect(ticks[0]).toBe(30); // Initial tick

    // Advance 30 full seconds
    jest.advanceTimersByTime(30000);

    expect(expireCount).toBe(1);
    expect(timer.isExpired()).toBe(true);
    expect(timer.isRunning()).toBe(false);
    expect(timer.getRemainingSec()).toBe(0);

    // Advance further — expire count must stay 1
    jest.advanceTimersByTime(10000);
    expect(expireCount).toBe(1);
  });

  test('short demo duration (5s) works properly', () => {
    let expired = false;
    const timer = new CountdownTimer({
      durationSec: 5,
      onExpire: () => { expired = true; },
    });

    timer.start();
    jest.advanceTimersByTime(5000);
    expect(expired).toBe(true);
  });
});
