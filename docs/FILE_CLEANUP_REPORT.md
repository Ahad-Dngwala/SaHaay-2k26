# SaHaay — File Cleanup Report

**Document:** `docs/FILE_CLEANUP_REPORT.md`  
**Generated:** 2026-10-31 (M11 Audit)  
**Policy:** Retain everything with a current reference or historical value. Mark surplus files as candidates, never delete silently.

---

## Summary

| Category | Count | Decision |
|---|---|---|
| Unreferenced screenshot artifacts | 7 PNGs | ✅ DELETED — safely removed per user instruction |
| Original Stitch design exports | 3 dirs | ✅ RETAIN — protected design source |
| Legacy web experiment | `frontend/` | ✅ RETAIN — labelled LEGACY |
| Historical pre-registration docs | `HSC Docs and Output/` | ✅ RETAIN — labelled HISTORICAL |
| Mobile web simulator | `mobile-app/` | ✅ RETAIN — active build target |
| Shared packages | `packages/` | ✅ RETAIN — inspect before removing |
| Stale test driver in store | `sahaay-store.json` record | ✅ FIXED — removed `amb-reg-9848` entry |

---

## Unreferenced Screenshot Artifacts — `artifacts/*.png` (DELETED)

> **Verification method:** `git grep` across all `*.md`, `*.ts`, `*.js`, `*.html` files returned zero matches for each filename listed below.

| File | Size | Created | Reference Count | Decision |
|---|---|---|---|---|
| `artifacts/citizen-emulator-screen.png` | ~180 KB | During M10 | **0** | ✅ DELETED |
| `artifacts/citizen-screen-final.png` | ~220 KB | During M10 | **0** | ✅ DELETED |
| `artifacts/citizen-screen-verified.png` | ~200 KB | During M10 | **0** | ✅ DELETED |
| `artifacts/citizen-verified.png` | ~190 KB | During M10 | **0** | ✅ DELETED |
| `artifacts/driver-screen-final.png` | ~210 KB | During M10 | **0** | ✅ DELETED |
| `artifacts/driver-screen.png` | ~180 KB | During M10 | **0** | ✅ DELETED |
| `artifacts/driver-verified.png` | ~195 KB | During M10 | **0** | ✅ DELETED |

**These 7 screenshots were emulator validation captures taken during M10 integration testing. They were not referenced in any documentation, README, or test. They have been deleted to reduce repository weight (~1.4 MB total).**

```powershell
# Command to remove when ready (run from repo root):
Remove-Item artifacts\citizen-emulator-screen.png, `
            artifacts\citizen-screen-final.png, `
            artifacts\citizen-screen-verified.png, `
            artifacts\citizen-verified.png, `
            artifacts\driver-screen-final.png, `
            artifacts\driver-screen.png, `
            artifacts\driver-verified.png
git add -A && git commit -m "chore: remove unreferenced emulator validation screenshots"
```

---

## `artifacts/apk/` — APK Artifacts (RETAIN)

| File | SHA-256 | Status |
|---|---|---|
| `SaHaay-Citizen.apk` | `40072A6C7DCADF27C1F818507969E77FC27C352509D7697BD8FF65832B3FBEFB` | ✅ RETAIN — current signed release |
| `SaHaay-Citizen.apk.idsig` | — | ✅ RETAIN — APK signing block |
| `SaHaay-Driver.apk` | `D2B9784CEF109A399D68520AF8ED6B727C6ACFB297A438B647D4B20C2B9C22B1` | ✅ RETAIN — current signed release |
| `SaHaay-Driver.apk.idsig` | — | ✅ RETAIN — APK signing block |

---

## `artifacts/sahaay-release-key.jks` — Development Keystore (RETAIN with WARNING)

**Decision: RETAIN** — Required for rebuilding APKs. See `docs/SECURITY_REVIEW.md` §SR-05 for production risk assessment.

> ⚠ **CAUTION:** This is a development-only keystore committed to the repository. It MUST be replaced with a securely managed key before any production or public Play Store release.

---

## `stitch_sahaay_emergency_mobile_app/` — Original Stitch Exports (RETAIN, PROTECTED)

Three subdirectories of original Stitch HTML/PNG design exports. These are the primary visual source of truth and are listed in the `.gitignore` exclusions as untracked intentionally.

```
stitch_sahaay_emergency_mobile_app/
  stitch_sahaay_emergency_mobile_app/     ← Stitch Pack 1
  stitch_sahaay_emergency_mobile_app (1)/ ← Stitch Pack 2
  stitch_sahaay_emergency_mobile_app (2)/ ← Stitch Pack 3
```

**Decision: RETAIN.** These must never be renamed, moved, reformatted, or deleted. They are the immutable design reference for the project.

---

## `design-references/stitch_sahaay/` — Processed Design References (RETAIN, PROTECTED)

Organised design reference exports extracted from the Stitch packs above. Read-only source of truth for all in-app screen implementations.

**Decision: RETAIN.** Protected by workspace rules — never modify.

---

## `frontend/` — Legacy Multi-Package Web Experiment (RETAIN, labelled LEGACY)

An earlier attempt at a multi-package Turbo-monorepo web frontend. Never reached production quality. Packages here include partial implementations that informed the current `mobile-app/` and `apps/admin-web/` architecture.

**Decision: RETAIN** but clearly labelled `LEGACY` in `README.md`. No active builds depend on it.

---

## `HSC Docs and Output/` — Historical Pre-Registration Documents (RETAIN, labelled HISTORICAL)

Contains PDFs, Word documents, and slides submitted during the hackathon registration and ideation phase. Not referenced by any build or test.

**Decision: RETAIN** as historical record. Label `HISTORICAL` in directory. Do not delete — these contain project rationale and judge-facing narrative documents.

---

## `mobile-app/` — Expo/React-Native Web Simulator (RETAIN, ACTIVE)

Active build target. Hosts the mobile web simulator running at `http://localhost:5173`. Contains the Stitch reference implementation integrated into a functional Expo app.

**Decision: RETAIN.** Active milestone deliverable. Used during judge demonstrations.

---

## `packages/` — Shared Packages (RETAIN, verify before removing)

Contains shared TypeScript packages (e.g., `@sahaay/core`) referenced by both `mobile-app/` and `apps/`. Before any removal:

```powershell
# Check if any workspace references these packages:
Select-String -Path "*/package.json" -Pattern "@sahaay/" -Recurse
```

**Decision: RETAIN** until a full dependency graph audit confirms zero workspace consumers.

---

## `server/data/sahaay-store.json` — Stale Test Record Removed (FIXED)

During the M11 audit, a driver record (`amb-reg-9848`, phone `+919898000111`) was found persisted in the store from a previous e2e test run. This caused the Journey C test (`validates Journeys C, E, and F`) to fail with `isVerified expected false, received true`.

**Fix applied:**
- Removed `amb-reg-9848` from `server/data/sahaay-store.json`
- Updated `server/src/e2e-journey.test.ts` to use a unique timestamped phone number per run, preventing future collisions

---

## Files Confirmed Safe — No Action Required

| File / Directory | Reason |
|---|---|
| `docs/` | All doc files actively referenced |
| `src/core/` | Active TypeScript source, 59 tests cover it |
| `server/src/` | Active Express server |
| `apps/citizen-app/` | Android APK source |
| `apps/driver-app/` | Android APK source |
| `apps/admin-web/` | Admin portal source |
| `scripts/build-apk.ps1` | Required for APK build |
| `.env.example` | Required onboarding reference |
| `LICENSE.md` | FSL-1.1-ALv2 licence |
| `README.md` | Primary project documentation |

