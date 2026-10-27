# SaHaay — Artificial Intelligence & Code Generation Disclosure

**Hackathon Compliance Statement:** Hack for Social Cause (VBYLD 2026/2027)

---

## 1. Summary of AI Assistance

In developing the SaHaay emergency dispatch prototype, Generative AI tools (including Claude, Gemini, and GitHub Copilot) were utilized as pair-programming assistants.

### Estimated Contribution Breakdown

| Workstream | Human Engineering % | AI-Assisted % | Description of AI Role |
|---|:---:|:---:|---|
| **Problem Definition & Architecture** | **85%** | **15%** | Problem framing, Indian emergency landscape analysis (108/112), and dual-transport architecture were designed by the team. AI assisted in generating mermaid diagrams and formatting. |
| **Core Algorithms (Matching & Index)** | **75%** | **25%** | Spatial grid binning strategy and synchronous locking requirements were specified by engineers. AI assisted in generating repetitive Haversine geometry and benchmark boilerplate. |
| **Wire Protocol & Codec (Base36)** | **70%** | **30%** | Fixed-point formula and CRC-8 design originated from team specifications. AI assisted in generating parity bit calculations and boundary test cases. |
| **Crash Detection Filter** | **65%** | **35%** | Thresholds ($2.5\text{ g}$ and $1000\text{ ms}$ stillness filter) were defined to eliminate potholes. AI helped synthesize accelerometer waveform fixtures for drops and crashes. |
| **Test Suites & Documentation** | **50%** | **50%** | Test case scenarios and edge-case boundaries were drafted collaboratively. AI generated test boilerplate and formatted claims matrix tables. |
| **Overall Project Codebase** | **70%** | **30%** | **Human-led architectural direction with AI code generation assistance.** |

---

## 2. Integrity Verification

- **No Silent AI Code:** Every generated function has been inspected, reviewed, and covered by automated test suites (`npm test` — 58 passed / 58 total).
- **No Hallucinated Benchmarks:** All performance metrics reported in `docs/BENCHMARK.md` were measured empirically on real hardware via `npm run bench`.
- **Honest Simulation Labelling:** Components that cannot execute in Expo Go (such as silent background telephony and native C++ offline tiles) are explicitly labelled as `SIMULATED` in code and UI, with their production architecture documented.
