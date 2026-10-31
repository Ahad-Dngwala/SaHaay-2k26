---
name: Emergency Response & Dispatch System
colors:
  surface: '#FFFEFA'
  surface-dim: '#e0d9d2'
  surface-bright: '#fff8f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf2ec'
  surface-container: '#f4ede6'
  surface-container-high: '#eee7e0'
  surface-container-highest: '#e9e1db'
  on-surface: '#1e1b17'
  on-surface-variant: '#58413b'
  inverse-surface: '#33302c'
  inverse-on-surface: '#f7efe9'
  outline: '#8c7169'
  outline-variant: '#e0bfb6'
  surface-tint: '#aa360e'
  primary: '#962900'
  on-primary: '#ffffff'
  primary-container: '#b84018'
  on-primary-container: '#ffe3db'
  inverse-primary: '#ffb59f'
  secondary: '#1a6c42'
  on-secondary: '#ffffff'
  secondary-container: '#a2f1bc'
  on-secondary-container: '#207046'
  tertiary: '#205671'
  on-tertiary: '#ffffff'
  tertiary-container: '#3c6e8b'
  on-tertiary-container: '#d3ecff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd1'
  primary-fixed-dim: '#ffb59f'
  on-primary-fixed: '#3a0a00'
  on-primary-fixed-variant: '#852300'
  secondary-fixed: '#a5f4bf'
  secondary-fixed-dim: '#89d7a4'
  on-secondary-fixed: '#00210f'
  on-secondary-fixed-variant: '#00522e'
  tertiary-fixed: '#c5e7ff'
  tertiary-fixed-dim: '#9ccded'
  on-tertiary-fixed: '#001e2d'
  on-tertiary-fixed-variant: '#124c67'
  background: '#fff8f3'
  on-background: '#1e1b17'
  surface-variant: '#e9e1db'
  canvas: '#FFF7D6'
  surface-muted: '#FFF0D0'
  ink: '#26231F'
  ink-muted: '#5F5A52'
  border: '#E7DECC'
  brand: '#B84018'
  brand-bright: '#F45A1F'
  brand-soft: '#FBE5D9'
  sos: '#B42318'
  sos-soft: '#FCE8E6'
  success: '#1F6F45'
  success-soft: '#E7F3E9'
  warning: '#875400'
  warning-soft: '#FFF1D4'
  info: '#285C78'
  map-bg: '#F1EFE8'
  map-road: '#FFFEFA'
  map-road-secondary: '#DCD6CB'
  map-route: '#C8471F'
typography:
  display-hero:
    fontFamily: Bowlby One SC
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: 0px
  display-hero-mobile:
    fontFamily: Bowlby One SC
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0px
  metric-lg:
    fontFamily: DM Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -1px
  metric-lg-mobile:
    fontFamily: DM Sans
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.5px
  screen-title:
    fontFamily: DM Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.3px
  section-title:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.2px
  ui-emphasis:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0px
  body-default:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0px
  body-supporting:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0px
  metadata-label:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.5px
  metadata-tag:
    fontFamily: DM Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 1px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-sm: 1rem
  margin: 1.5rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.75rem
  space-xxl: 2rem
---

## Brand & Style

### Brand Personality & Purpose
This design system powers a life-critical emergency medical dispatch and response platform built for high-stakes urban and regional environments in India. The design philosophy reconciles acute situational urgency with deep psychological reassurance. Emergency products often fall into one of two traps: sterile, alienating clinical coldness or alarmist, anxiety-inducing visual panic. This design system bypasses both extremes. It employs warm cream surfaces, grounded terracotta hues, and humanistic geometry to project unflinching stability, civic accountability, and human warmth under stress.

The system serves two distinct mobile users through parallel workflows:
1. **Citizens / Patients:** Individuals experiencing or witnessing acute distress, requiring deterministic single-tap triggers, unambiguous status progression, zero cognitive noise, and honest fail-safes (such as manual SMS fallbacks and direct emergency hotline tie-ins).
2. **Ambulance Drivers & First Responders:** Field operators working inside moving vehicles under harsh ambient lighting and high vibration, demanding oversized touch targets, instantaneous trip confirmations, rapid breakdown reporting, and glanceable map-to-sheet hierarchies.

### Design Movement & Aesthetic Archetype
The system combines **Tactile Utilitarianism** with **Modern Editorial Hierarchy**:
- **Tactile Utilitarianism:** Interfaces are strictly flat-to-subtle, eschewing heavy glassmorphic blurs or power-hungry multi-stop drop shadows in favor of crisp 1px neutral borders, clear figure-ground contrast, and tangible physical metaphors (large pill switches, high-contrast segmented states, tactile countdown dismissals).
- **Purposeful Editorial Contrast:** An expressive, heavy display typeface anchors high-level orientation and identity moments, while a pristine, high-legibility geometric sans-serif runs all operational UI, metric readouts, and tabular data.
- **Product Truth & Honest States:** The UI communicates real-world technical realities rather than synthetic optimism. System states explicitly declare mock or waiting constraints (e.g., explicit waiting states when GPS streams lag, prominent `SIMULATED SMS` labels during offline degraded modes, and manual breakdown re-dispatch workflows).

## Colors

### Color Strategy & Psychological Hierarchy
The color system operates strictly in a warm, high-contrast light mode. Clinical stark whites (`#FFFFFF`) and harsh pure blacks (`#000000`) are replaced with an organic cream foundation and warm charcoal-ink typography. Every operational state adheres to strict chromatic boundaries to prevent cognitive confusion during emergencies:

- **Canvas & Structural Surfaces (`canvas`, `surface`, `surface-muted`):** The foundation is built upon `#FFF7D6` (warm cream canvas), providing an earthy, non-clinical substrate. Active cards, forms, and bottom sheets elevate atop this canvas using `#FFFEFA` (crisp porcelain white) to produce distinct structural boundaries without relying on heavy drop shadows.
- **Brand Identity vs. Critical Emergency (`brand` vs. `sos`):** A strict boundary separates corporate action from life-critical distress:
  - **Brand Accent (`#B84018` / `#F45A1F`):** Rich burnt terracotta and warm fiery orange dictate standard primary navigation, routine driver acceptance CTAs, and selected interactive chips.
  - **Life-Critical Emergency (`#B42318` / `#FCE8E6`):** Deep crimson red is isolated exclusively for immediate SOS triggers, critical cancellation warnings, and crash alert states. Full-screen flashing red fills are prohibited; critical alerts instead use container fills of `#FCE8E6` with high-contrast `#B42318` borders and typography to maintain clarity under stress.
- **Affirmative & Operational States (`success`, `warning`, `info`):**
  - **Success (`#1F6F45` / `#E7F3E9`):** Deep forest green denotes verified driver arrival, successful dispatch handoffs, and active availability toggles.
  - **Warning (`#875400` / `#FFF1D4`):** Ochre gold handles degraded connectivity, pending network synchronization, and crash verification countdown alerts.
  - **Information (`#285C78`):** Deep slate blue provides neutral telemetry, advisory broadcast banners (e.g., Green Corridor notifications), and simulated infrastructure notes.
- **Cartographic Subsystem (`map-bg`, `map-road`, `map-route`):** Native vector maps employ subdued landmass tones (`#F1EFE8`) and differentiated road arteries (`#FFFEFA`, `#DCD6CB`), allowing the high-contrast burnt route vector (`#C8471F`) to remain instantly scannable under direct sunlight.

## Typography

### Typographic Strategy & Hierarchy
The typographic architecture employs two contrasting typographic roles:
1. **Expressive Display (`Bowlby One SC`):** A dense, robust, all-caps display typeface reserved strictly for high-impact brand statements, onboarding hero hooks, and primary splash moments. It provides rugged civic authority and warmth without being decorative or fragile.
2. **Operational Sans-Serif (`DM Sans`):** The functional workhorse powering all screen headings, forms, ETA cards, tracking indicators, and telemetry. It balances geometric neutrality with humanist legibility, providing clear glyph distinction under high glare or rapid scanning.

### Specialized Typography Rules
- **Tabular Numerals for Metrics:** All dynamic counters, countdown rings (such as the 30-second crash confirmation), and real-time ETAs utilize `metric-lg` styles with monospaced tabular numerals (`font-variant-numeric: tabular-nums`) to prevent layout jitter as digits update.
- **Eyebrow & Protocol Metadata:** System provenance tags (e.g., `SIMULATED SMS`, `OFFLINE CACHED`, `GOVT 112 TIE-IN`) use `metadata-tag` rendered in structured uppercase with generous `+1px` tracking.
- **Minimum Legibility Limits:** Body text never drops below 14px (`body-supporting`) for critical instructional copy, and secondary helper text maintains a strict contrast ratio of ≥ 4.5:1 against the canvas.

## Layout & Spacing

### Layout Philosophy & Responsive Architecture
The system is engineered as a **mobile-first application** targeted at reference dimensions of **390 × 844 dp** (standard mobile viewport) while fluidly contracting down to compact **360 dp** screens and scaling upwards to tablet/dispatch companion devices.

- **Grid & Alignment Rhythm:** An atomic 4px base rhythm governs all micro-spacing, expanding to an 8px structural layout cadence.
  - Micro padding & badge offsets: `4px` (`space-xs`), `8px` (`space-sm`)
  - Content gaps & internal card padding: `16px` (`space-md`), `20px` (`space-lg`)
  - Section dividers & view blocks: `28px` (`space-xl`), `32px` (`space-xxl`)
- **Horizontal Screen Padding:** Fixed at `24px` on standard viewports (`margin`), reducing gracefully to `20px` (`margin-mobile`) on screens ≤ 375px wide to preserve critical content width.

### Dual-Layer Map & Bottom Sheet Composition
The mission-critical tracking interface divides the viewport into two balanced zones:
- **Upper Geospatial Frame (Top 42%–48%):** Dedicated vector map canvas displaying user coordinates, ambulance telemetry, routing lines, and minimal floating utility pills (center-map, layer toggles).
- **Lower Draggable Control Sheet (Bottom 52%–58%):** An interactive bottom sheet featuring a top grab handle (36px × 4px), driver identity avatar, vehicle registration badge, active call trigger, and an interactive vertical timeline.
- **Touch Accessibility Mandate:** Every primary action, SOS trigger, and bottom navigation item enforces a strict minimum target bounding box of **48 × 48 dp**. Primary workflow CTAs standardise at a fixed height of **56 dp**.

## Elevation & Depth

### Depth Philosophy
The design avoids performance-intensive drop shadows, multi-layered blurs, and glassmorphism. Emergency interfaces run on varied devices under fluctuating network conditions and battery-saving modes. Visual hierarchy is achieved through **structural containment, surface tonal tiering, and high-contrast hairlines**:

1. **Canvas Layer (`canvas` #FFF7D6):** The base level of the application, visible behind main cards, during onboarding, and framing segmented views.
2. **Elevated Surfaces (`surface` #FFFEFA):** Primary cards, list rows, bottom action drawers, and input containers float above the canvas. They use a crisp 1px solid border (`border` #E7DECC) to guarantee edge definition on screens with poor ambient contrast.
3. **Muted Inset Containers (`surface-muted` #FFF0D0):** Internal groupings (such as driver trip notes or breakdown summaries) recede slightly into a warm, low-contrast fill without requiring dropshadows.
4. **Subtle Tactile Shadow (Floating Action Only):** Floating controls positioned over dynamic map backgrounds (e.g., recenter map button, top back navigation, floating SOS pills) utilize a single, restrained ambient shadow: `box-shadow: 0 4px 12px rgba(38, 35, 31, 0.08)`.
5. **Modal Dimming:** Urgent modal overlays (such as the crash-detection cancellation sheet or SOS confirmation sheet) dim background content with a solid 40% ink scrim (`rgba(38, 35, 31, 0.40)`) to lock visual focus onto immediate confirmation tasks.

## Shapes

### Shape Language & Radius Hierarchy
The geometric personality uses generous, friendly rounded corners that soften the tension of emergency workflows while preserving structural efficiency. Corner radii scale proportionally with element surface area:

- **Full Pills (`9999px`):** Chips, metadata tags, status banners, circular icon buttons, and floating quick-call triggers.
- **Bottom Sheets & Drawer Containers (`24px`):** Top left and right corners of active tracking bottom sheets and sliding modal surfaces.
- **Cards & Modular Blocks (`20px`):** Content containers, driver information panels, and mission summary modules.
- **Buttons & Primary Actions (`16px`):** High-priority CTAs, emergency dispatch triggers, and full-width form buttons.
- **Form Inputs & Search Fields (`14px`):** Address input bars, driver notes, and toggle backgrounds.

### Stroke Treatments
- Structural borders maintain a constant `1px` stroke weight in `#E7DECC`.
- High-contrast route vectors on map views employ a bold `4px` to `6px` solid stroke in `#C8471F` with rounded end-caps and joints.

## Components

### 1. Buttons & Emergency Triggers
- **Primary Action Button:** 56px height, 16px corner radius, `#B84018` fill, `#FFFEFA` bold text (`ui-emphasis`), center-aligned. Disabled states use `#E7DECC` fill with `#5F5A52` text.
- **Life-Critical SOS Trigger:** Minimum 60px height or 80px circular button, `#B42318` solid crimson fill, white text, bold label. Enclosed within an outer protective warm ripple indicator to prevent accidental activation.
- **"I'm Safe — Cancel Alert" Action:** High-priority, oversized 56px dismiss button styled in high-contrast neutral (`#26231F` fill with `#FFFEFA` label) placed directly below active countdown indicators.
- **Call 112 Fallback Button:** Secondary tactile pill with a phone icon, bordered in 1.5px `#B42318` stroke, `#FFFEFA` surface, and `#B42318` label.

### 2. Form Inputs & Search Fields
- **Container:** 56px fixed height, 14px radius, `#FFFEFA` background, 1px `#E7DECC` outline.
- **Active / Focused State:** 1.5px border in `#B84018`, zero intrusive outer glow.
- **Text & Placeholder:** Input text set in `body-default` (`#26231F`); placeholder text in `ink-muted` (`#5F5A52`).
- **Trailing Affordance:** Clear, accessible 24px icon target for clearing input or toggling GPS current-location auto-fill.

### 3. Cards & Bottom Sheets
- **Draggable Tracking Sheet:** `#FFFEFA` surface, 24px top border radius, subtle 1px top border in `#E7DECC`. Includes a centered drag indicator pill (36px × 4px, `#E7DECC`, 12px top inset).
- **Driver / Vehicle Header Row:** 48px circular driver avatar flanked by driver name (`ui-emphasis`), vehicle model, rating pill, and a direct 48 × 48 dp circular call button (`#B84018` soft tint `#FBE5D9` with `#B84018` icon).
- **Information Cards:** `#FFFEFA` background, 20px radius, 1px `#E7DECC` border, 20px internal padding.

### 4. Vertical Connected Timeline
- **Structure:** Used in tracking views to communicate dispatch stages: Request Received → Driver Assigned → Out for Rescue → Arrived at Location.
- **Node Geometry:** 24px circular indicator connected by a vertical 2px solid hairline stroke (`#E7DECC`).
- **Completed Nodes:** Filled `#1F6F45` (or `#B84018`) with white checkmark glyph.
- **Active Node:** Outlined in 2px `#B84018` with an internal pulsing core, accompanied by estimated arrival duration text in bold blue/brand emphasis.
- **Upcoming Nodes:** `#E7DECC` circular stroke, `#FFFEFA` center, muted typography.

### 5. Badges, Tags & Chips
- **SIMULATED SMS Tag:** Fully rounded pill (9999px), `#FFF1D4` background, 1px `#875400` border, `#875400` bold uppercase label (`metadata-tag`). Used across degraded network states to transparently denote simulated mock protocols.
- **Status Badges:** Paired solid-and-tint system:
  - Confirmed / Arrived: `#E7F3E9` background, `#1F6F45` text.
  - Urgent Caution / Searching: `#FFF1D4` background, `#875400` text.
  - SOS / Breakdown: `#FCE8E6` background, `#B42318` text.

### 6. Crash Detection Countdown Timer
- **Telemetry Container:** Centered card with a 120px circular radial progress ring.
- **Metric Presentation:** Large 40px countdown numerals (`metric-lg`) displaying elapsed seconds remaining (e.g., `00:24`).
- **Action Pair:** Prominent full-width "I'm Safe — Cancel" button positioned above a subdued "Trigger SOS Now" text button. Full-screen flashing alarms or sudden audio disruptions are avoided.

### 7. Ambulance Driver Workflow Specifics
- **Incoming Mission Banner:** High-priority sticky card with pickup address, patient condition tag, distance in kilometers, and split "Decline" / "Accept Mission" controls (minimum 56px touch target).
- **Conflict State:** Immediate inline banner indicating "Assignment Taken by Another Unit" with a single-tap button to return to standby mode.
- **Report Breakdown Drawer:** Quick 3-tap bottom sheet allowing the driver to flag vehicle failure, instantly notifying the central dispatch system to initiate automated citizen re-routing.