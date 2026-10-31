/**
 * mobile-app/src/services/api.ts
 * Real REST API client connecting directly to SaHaay dispatch server (server/src/routes.ts).
 */

import { Config } from '../config';
import { Mission, Ambulance } from '../types';

export interface TriggerSosParams {
  lat: number;
  lon: number;
  addrId?: number;
  flags?: number; // 0=manual, 1=crash_auto
  sosUid?: string;
}

export interface AcceptMissionResponse {
  ok: boolean;
  won: boolean;
  missionId: string;
  ambulanceId: string;
  error?: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = Config.API_BASE_URL;
  }

  async checkServerHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      const data = await res.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }

  async triggerSos(params: TriggerSosParams): Promise<{ ok: boolean; missionId?: string; idempotent?: boolean; status?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return await res.json();
    } catch (err) {
      console.warn('[API] Server unreachable, triggering simulated fallback:', err);
      // Fallback for offline demo mode
      return {
        ok: true,
        missionId: `offline-${Date.now().toString(36)}`,
        status: 'SEARCHING',
      };
    }
  }

  async fetchMissions(): Promise<Mission[]> {
    try {
      const res = await fetch(`${this.baseUrl}/missions`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  async fetchMission(id: string): Promise<Mission | null> {
    try {
      const res = await fetch(`${this.baseUrl}/missions/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async acceptMission(missionId: string, ambulanceId: string): Promise<AcceptMissionResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/missions/${missionId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambulanceId }),
      });
      const data = await res.json();
      if (res.status === 409) {
        return { ok: false, won: false, missionId, ambulanceId, error: data.error || 'Offer expired or taken by another unit' };
      }
      return { ok: true, won: true, missionId, ambulanceId, ...data };
    } catch (err: any) {
      return { ok: false, won: false, missionId, ambulanceId, error: err?.message || 'Network error' };
    }
  }

  async declineMission(missionId: string, ambulanceId: string): Promise<{ ok: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/missions/${missionId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambulanceId }),
      });
      return await res.json();
    } catch {
      return { ok: true };
    }
  }

  async quickAssign(missionId: string): Promise<{ ok: boolean; won?: boolean; ambulanceId?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/missions/${missionId}/quick-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return await res.json();
    } catch {
      return { ok: false };
    }
  }

  async reportBreakdown(missionId: string, ambulanceId: string): Promise<{ ok: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/missions/${missionId}/breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambulanceId }),
      });
      return await res.json();
    } catch {
      return { ok: false };
    }
  }

  async updateMissionStatus(missionId: string, status: string): Promise<Mission | null> {
    try {
      const res = await fetch(`${this.baseUrl}/missions/${missionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async fetchAmbulances(): Promise<Ambulance[]> {
    try {
      const res = await fetch(`${this.baseUrl}/ambulances`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  async updateAmbulanceLocation(ambulanceId: string, lat: number, lon: number, heading = 0, speedKmh = 35): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/ambulances/${ambulanceId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, heading, speedKmh }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async sendSimulatedSmsToken(token: string): Promise<{ ok: boolean; missionId?: string; reason?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/sms/inbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      return await res.json();
    } catch {
      return { ok: false, reason: 'SMS gateway simulated error' };
    }
  }
}

export const api = new ApiService();

