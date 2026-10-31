/**
 * server/src/sms-gateway.ts
 *
 * Real SMS Fallback Gateway Adapter (Spec Section 7).
 * Supports LoopbackProvider (for tests), AndroidSmsGatewayProvider,
 * and DriverAppGatewayProvider (driver app in-app gateway mode).
 */

import { decodeSmsPacket, SmsPacket, encodeA1, encodeT1, encodeO1, encodeX1 } from './sms-protocol-adapter';
import { state } from './state';
import { auditLog } from './audit';
import { Config } from './config-server';
import { acceptMission, declineMission, recordTelemetry, cancelMissionByPatient, driverCancelMission } from './dispatch';

export interface OutboundSmsItem {
  id: string;
  to: string;
  message: string;
  queuedAt: number;
  attempts: number;
  status: 'PENDING' | 'SENT' | 'FAILED';
}

export interface SmsGatewayProvider {
  name: string;
  sendSms(to: string, message: string): Promise<boolean>;
}

// ── Providers ────────────────────────────────────────────────────────────────

export class LoopbackProvider implements SmsGatewayProvider {
  name = 'LoopbackProvider';
  public sentMessages: Array<{ to: string; message: string; timestamp: number }> = [];

  async sendSms(to: string, message: string): Promise<boolean> {
    this.sentMessages.push({ to, message, timestamp: Date.now() });
    return true;
  }

  clear(): void {
    this.sentMessages = [];
  }
}

export class AndroidSmsGatewayProvider implements SmsGatewayProvider {
  name = 'AndroidSmsGatewayProvider';

  constructor(private gatewayApiUrl: string, private apiKey?: string) {}

  async sendSms(to: string, message: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

      const res = await fetch(`${this.gatewayApiUrl}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phoneNumbers: [to], message }),
      });
      return res.ok;
    } catch (err: any) {
      console.warn('AndroidSmsGatewayProvider error:', err.message);
      return false;
    }
  }
}

// ── In-Memory Outbox Queue ───────────────────────────────────────────────────

class SmsGatewayManager {
  private outbox: OutboundSmsItem[] = [];
  private provider: SmsGatewayProvider;
  private smsSeq = 0;

  constructor() {
    this.provider = new LoopbackProvider();
  }

  setProvider(p: SmsGatewayProvider): void {
    this.provider = p;
  }

  getProvider(): SmsGatewayProvider {
    return this.provider;
  }

  queueSms(to: string, message: string): OutboundSmsItem {
    this.smsSeq++;
    const item: OutboundSmsItem = {
      id: `sms-${Date.now()}-${this.smsSeq}`,
      to,
      message,
      queuedAt: Date.now(),
      attempts: 0,
      status: 'PENDING',
    };
    this.outbox.push(item);

    auditLog('SMS_QUEUED', {
      smsId: item.id,
      to,
      preview: message.slice(0, 30),
      len: message.length,
    });

    // Try sending immediately if provider is loopback or direct
    this.provider.sendSms(to, message).then(success => {
      if (success) {
        item.status = 'SENT';
      }
    }).catch(() => {
      item.status = 'PENDING';
    });

    return item;
  }

  getPendingOutbox(): OutboundSmsItem[] {
    return this.outbox.filter(item => item.status === 'PENDING');
  }

  ackSms(id: string): boolean {
    const item = this.outbox.find(i => i.id === id);
    if (!item) return false;
    item.status = 'SENT';
    return true;
  }

  clearOutbox(): void {
    this.outbox = [];
  }
}

export const smsGateway = new SmsGatewayManager();
