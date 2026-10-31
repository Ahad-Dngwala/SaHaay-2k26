/**
 * server/src/storage.ts
 * File-backed persistence store for SaHaay.
 * Persists citizens, drivers, missions, news/updates CMS, and APK releases to disk.
 */

import fs from 'fs';
import path from 'path';

export interface CitizenData {
  id: string;
  phone: string;
  name: string;
  bloodGroup: string;
  emergencyContacts: Array<{ name: string; phone: string; relationship: string }>;
  allergies: string[];
  medicalNotes: string;
  createdAt: number;
}

export interface DriverData {
  id: string;
  name: string;
  phone: string;
  licenseNo: string;
  vehicleNo: string;
  ambulanceType: 'BLS' | 'ALS' | 'ICU';
  isVerified: boolean;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isOnDuty: boolean;
  currentLat: number;
  currentLon: number;
  heading: number;
  speedKmh: number;
  assignedMissionId?: string;
  createdAt: number;
}

export interface NewsPostData {
  id: string;
  title: string;
  category: 'GOVT_ALERT' | 'ROAD_SAFETY' | 'DISASTER_PREP' | 'HEALTH_BULLETIN' | 'SAHAAY_UPDATE';
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  body: string;
  imageUrl?: string;
  sourceUrl?: string;
  officialSource?: string;
  isPinned: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: number;
  createdAt: number;
}

export interface ReleaseData {
  id: string;
  appType: 'citizen' | 'driver';
  versionName: string;
  versionCode: number;
  fileName: string;
  fileSize: number;
  sha256: string;
  minAndroid: string;
  releaseNotes: string[];
  downloadUrl: string;
  isPublished: boolean;
  publishedAt: number;
}

export interface AppStoreSchema {
  citizens: Record<string, CitizenData>;
  drivers: Record<string, DriverData>;
  news: Record<string, NewsPostData>;
  releases: Record<string, ReleaseData>;
}

const DATA_DIR = path.join(__dirname, '../data');
const STORE_FILE = path.join(DATA_DIR, 'sahaay-store.json');

const INITIAL_STORE: AppStoreSchema = {
  citizens: {
    'cit-demo-1': {
      id: 'cit-demo-1',
      phone: '+919876543210',
      name: 'Aarav Patel',
      bloodGroup: 'B+',
      emergencyContacts: [
        { name: 'Dr. Priya Patel', phone: '+919876543211', relationship: 'Spouse' },
        { name: 'Kavita Patel', phone: '+919876543212', relationship: 'Sister' },
      ],
      allergies: ['Penicillin', 'Sulfa drugs'],
      medicalNotes: 'Type-1 diabetic. Asthmatic (inhaler carried).',
      createdAt: Date.now() - 86400000 * 3,
    },
  },
  drivers: {
    'amb-01': {
      id: 'amb-01',
      name: 'Ramesh Patel',
      phone: '+919825012345',
      licenseNo: 'GJ-01-2019-004821',
      vehicleNo: 'GJ-01-AX-4020',
      ambulanceType: 'ALS',
      isVerified: true,
      verificationStatus: 'VERIFIED',
      isOnDuty: true,
      currentLat: 23.0365,
      currentLon: 72.5611,
      heading: 45,
      speedKmh: 0,
      createdAt: Date.now() - 86400000 * 10,
    },
    'amb-02': {
      id: 'amb-02',
      name: 'Mukesh Solanki',
      phone: '+919825054321',
      licenseNo: 'GJ-01-2022-009133',
      vehicleNo: 'GJ-01-BY-1122',
      ambulanceType: 'BLS',
      isVerified: false,
      verificationStatus: 'PENDING',
      isOnDuty: false,
      currentLat: 23.0487,
      currentLon: 72.5694,
      heading: 0,
      speedKmh: 0,
      createdAt: Date.now() - 86400000 * 1,
    },
  },
  news: {
    'news-01': {
      id: 'news-01',
      title: 'Gujarat Emergency Medical Services Upgrade: 108 Fleet Modernization',
      category: 'GOVT_ALERT',
      priority: 'CRITICAL',
      body: 'State Health & Family Welfare Department announces 24/7 dedicated dispatch integration with SaHaay offline emergency mesh across Ahmedabad metro area.',
      officialSource: 'Gujarat Health Department Bulletin No. 44',
      sourceUrl: 'https://gujhealth.gujarat.gov.in',
      isPinned: true,
      status: 'PUBLISHED',
      publishedAt: Date.now() - 3600000 * 12,
      createdAt: Date.now() - 3600000 * 12,
    },
    'news-02': {
      id: 'news-02',
      title: 'Monsoon Waterlogging Safety Advisory: Low-lying Underspasses in Ashram Road',
      category: 'ROAD_SAFETY',
      priority: 'HIGH',
      body: 'Drivers and citizens advised to avoid Akhbarnagar and Usmanpura underpasses during heavy rain. Alternative elevated routes mapped on SaHaay telemetry.',
      officialSource: 'Ahmedabad Municipal Corporation (AMC)',
      sourceUrl: 'https://ahmedabadcity.gov.in',
      isPinned: false,
      status: 'PUBLISHED',
      publishedAt: Date.now() - 3600000 * 24,
      createdAt: Date.now() - 3600000 * 24,
    },
    'news-03': {
      id: 'news-03',
      title: 'CPR and First Response Workshops at Civil Hospital Ahmedabad',
      category: 'DISASTER_PREP',
      priority: 'NORMAL',
      body: 'Free public certified training in emergency compression and automated external defibrillator usage every Saturday morning.',
      officialSource: 'Civil Hospital Ahmedabad Trauma Wing',
      sourceUrl: 'https://civilhospitalahmedabad.org',
      isPinned: false,
      status: 'PUBLISHED',
      publishedAt: Date.now() - 3600000 * 48,
      createdAt: Date.now() - 3600000 * 48,
    },
  },
  releases: {
    'rel-citizen': {
      id: 'rel-citizen',
      appType: 'citizen',
      versionName: '1.0.0',
      versionCode: 1,
      fileName: 'SaHaay-Citizen.apk',
      fileSize: 21068,
      sha256: '40072A6C7DCADF27C1F818507969E77FC27C352509D7697BD8FF65832B3FBEFB',
      minAndroid: 'Android 10 (API 29)+',
      releaseNotes: [
        'Initial release of SaHaay Citizen Native Android App',
        'Tactile 112 hotline and Red SOS hold-to-confirm emergency dispatch',
        'Automatic impact crash detection with 30s cancellation countdown',
        'Live approaching ambulance tracking across Ahmedabad with real ETA',
        'Repurposed government alerts & road safety awareness updates feed',
      ],
      downloadUrl: '/downloads/SaHaay-Citizen.apk',
      isPublished: true,
      publishedAt: Date.now(),
    },
    'rel-driver': {
      id: 'rel-driver',
      appType: 'driver',
      versionName: '1.0.0',
      versionCode: 1,
      fileName: 'SaHaay-Driver.apk',
      fileSize: 21069,
      sha256: 'D2B9784CEF109A399D68520AF8ED6B727C6ACFB297A438B647D4B20C2B9C22B1',
      minAndroid: 'Android 10 (API 29)+',
      releaseNotes: [
        'Initial release of SaHaay Ambulance Driver Native Android App',
        'Strict driver & vehicle license verification gate',
        'On-duty radar dome availability and live GPS telemetry broadcast',
        'Atomic first-accept emergency mission lock',
        'Navigation stages: en route, arrived, picked up, hospital handover',
        'Driver vehicle breakdown reporting with automatic replacement dispatch',
      ],
      downloadUrl: '/downloads/SaHaay-Driver.apk',
      isPublished: true,
      publishedAt: Date.now(),
    },
  },
};

export class PersistentStorage {
  private data: AppStoreSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): AppStoreSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('⚠️ Could not load storage file, initializing with defaults', err);
    }
    this.save(INITIAL_STORE);
    return JSON.parse(JSON.stringify(INITIAL_STORE));
  }

  public save(dataToSave?: AppStoreSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ Failed to save storage file', err);
    }
  }

  // Citizens
  public getCitizen(id: string): CitizenData | undefined {
    return this.data.citizens[id];
  }

  public getCitizenByPhone(phone: string): CitizenData | undefined {
    return Object.values(this.data.citizens).find((c) => c.phone === phone);
  }

  public saveCitizen(citizen: CitizenData): void {
    this.data.citizens[citizen.id] = citizen;
    this.save();
  }

  public listCitizens(): CitizenData[] {
    return Object.values(this.data.citizens);
  }

  // Drivers
  public getDriver(id: string): DriverData | undefined {
    return this.data.drivers[id];
  }

  public getDriverByPhone(phone: string): DriverData | undefined {
    return Object.values(this.data.drivers).find((d) => d.phone === phone);
  }

  public saveDriver(driver: DriverData): void {
    this.data.drivers[driver.id] = driver;
    this.save();
  }

  public listDrivers(): DriverData[] {
    return Object.values(this.data.drivers);
  }

  // News / CMS
  public listNews(onlyPublished = true): NewsPostData[] {
    const all = Object.values(this.data.news);
    const filtered = onlyPublished ? all.filter((n) => n.status === 'PUBLISHED') : all;
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.publishedAt - a.publishedAt;
    });
  }

  public saveNews(post: NewsPostData): void {
    this.data.news[post.id] = post;
    this.save();
  }

  public deleteNews(id: string): boolean {
    if (this.data.news[id]) {
      delete this.data.news[id];
      this.save();
      return true;
    }
    return false;
  }

  // Releases
  public getRelease(appType: 'citizen' | 'driver'): ReleaseData | undefined {
    return Object.values(this.data.releases).find((r) => r.appType === appType && r.isPublished);
  }

  public listReleases(): ReleaseData[] {
    return Object.values(this.data.releases);
  }

  public saveRelease(release: ReleaseData): void {
    this.data.releases[release.id] = release;
    this.save();
  }
}

export const storage = new PersistentStorage();

