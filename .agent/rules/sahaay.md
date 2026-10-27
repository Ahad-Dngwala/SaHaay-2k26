---
trigger: always_on
---

# SaHaay workspace rules

PROJECT: SaHaay – offline-first emergency ambulance dispatch for India (Hack for Social Cause 2027, theme: Healthcare, Wellbeing & Service Delivery).
STACK: Expo (latest SDK, TypeScript, expo-router) + react-native-web, Node/Express/ws dispatch server in /server, Turf.js, react-native-svg, Reanimated. No native modules outside Expo Go. NEVER run EAS builds or produce APKs.

HOW YOU WORK

1. Read HANDOFF.md first in every new session, then continue from "NEXT". Update HANDOFF.md at the end of every milestone and before any long task.
2. Verify, don't assume. After each change run: `npx tsc --noEmit`, `npm test`, then run the app and LOOK at it:
   - Web: `npx expo start --web`, drive it with the browser tool, take screenshots, read the console.
   - Android emulator: `npx expo start --android`; screenshot with `adb exec-out screencap -p > /tmp/s.png` and view it; read logs with `adb logcat -s ReactNativeJS`.
3. Fix errors yourself in a loop (max 5 attempts per error), then log it in HANDOFF.md "KNOWN ISSUES" and move on. Do not ask permission for routine commands inside the repo.
4. Small commits per milestone: `git add -A && git commit -m "M<n>: ..."`.
5. Prefer plain code over new dependencies. Any new dependency must work in Expo Go and on web.
6. Honesty: anything simulated is labelled SIMULATED in code, README and UI. Never invent performance numbers; measure them with a script and report what you measured.
7. Single source of truth for tunables: `src/core/config.ts`. No magic numbers elsewhere.
8. Keep files < 1000 lines. Write tests for all pure logic (codec, matching, state machine, kinematics).
