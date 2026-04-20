# Mobile App Design Plan — OWL Performance

This document captures what the mobile app does, how its UI should feel, and a phased plan to bring it in line with the web app's design language.

## What the mobile app is

The mobile app is the **client-side companion** to OWL Performance, a coaching platform. Coaches work from the web app (dashboard, program authoring, messaging, analytics); clients use the mobile app to execute their programs day-to-day.

### Navigation map

```
/                         Entry — routes based on auth state
├─ (auth)/
│   ├─ login              Email/password + Google + Apple
│   ├─ forgot-password    Password reset
│   ├─ accept-invite      Claim coach-issued invite code
│   └─ needs-invite       Firebase user without a coach-issued profile
└─ (client)/              Authenticated tab bar (Today / Metrics / Habits / Messages / Profile)
    ├─ today              Today's scheduled workouts + completion progress
    ├─ metrics            Client-tracked metrics (weight, sleep, etc.) with sparklines
    ├─ metric/[metricId]  Single-metric detail + log entry
    ├─ habits             Daily habit checklist (simple + counted)
    ├─ messages/          Inbox of conversations with the coach
    ├─ messages/[threadId] Single thread
    ├─ log/[instanceId]   Live workout logger (sets, reps, RPE, video cues)
    ├─ notifications      Push history
    └─ profile            Account, preferences, sign out
```

### Primary user flows

The client opens the app to **Today**, taps a scheduled workout to open the **logger**, fills in sets as they train, and submits. Between sessions they log **metrics** and tick off **habits**. If something is off they **message** their coach. The coach sees everything on the web side.

## Design target — match the web vibe

The web app uses a polished, "coaching OS" aesthetic:

- **Brand**: slate-violet "Owl" (hue ≈ 285) as primary
- **Accent**: warm amber (hue ≈ 65) for emphasis / gradients
- **Semantics**: green success, amber warning, red destructive, blue info
- **Surfaces**: soft off-white cards on a slightly cooler background; rounded-xl (12px) corners; thin 1px borders
- **Typography**: Inter (LTR) / Heebo (RTL), tight tracking, tabular-nums for metrics
- **Motion**: subtle lift on press, 320ms fade-up on mount, never flashy
- **Dark mode**: deep cool-slate backgrounds, raised cards, the same brand hue shifted lighter
- **Icons**: `lucide-react` — clean 1.5px line weight, feather-style
- **Signature flourishes**: `aurora` radial gradients on hero / CTA bands; brand→accent gradient text; glass blur on sticky bars

The mobile app today diverges from all of this: hardcoded `#2563eb` blue, emoji tab icons, no dark mode, hex colors scattered across 300-line StyleSheets. The goal is **visual + structural parity** with the web, translated to the platform idioms of iOS and Android (tab bar, safe areas, press feedback, Dynamic Type).

## Target file structure

```
apps/mobile/
├─ lib/
│   └─ theme/
│       ├─ colors.ts         Light + dark palettes (brand, accent, semantic, surface)
│       ├─ spacing.ts        4/8/12/16/20/24/32/40/48/64
│       ├─ radii.ts          sm/md/lg/xl/2xl — matches web --radius tokens
│       ├─ typography.ts     Display/h1/h2/body/caption/eyebrow with weights
│       ├─ shadows.ts        Card, elevated, glow (matches web --shadow-glow)
│       ├─ index.ts          Exports `theme` + `useTheme()` hook (color-scheme aware)
│       └─ ThemeProvider.tsx Wraps the app, reacts to Appearance changes
├─ components/
│   ├─ ui/
│   │   ├─ Screen.tsx        SafeAreaView + themed bg + optional header
│   │   ├─ Card.tsx          rounded-xl, border, card bg, optional pressable lift
│   │   ├─ Button.tsx        variants: default / gradient / outline / ghost / destructive; sizes: sm/md/lg/xl/icon
│   │   ├─ Badge.tsx         default / success / warning / destructive / muted (pill)
│   │   ├─ Text.tsx          variant-driven Text (display/h1/body/caption/eyebrow)
│   │   ├─ Input.tsx         themed TextInput w/ label + error state
│   │   ├─ Avatar.tsx        circle initials + presence dot (matches web)
│   │   ├─ ProgressBar.tsx   1.5px bar used on Today + Habits
│   │   └─ Icon.tsx          lucide-react-native wrapper, theme-aware color/size
│   ├─ brand/
│   │   └─ OwlLogo.tsx       SVG lockup matching web OwlLogo (mark + wordmark variants)
│   └─ (feature components stay where they are: ExerciseVideoModal, Sparkline)
└─ app/ (unchanged structure — screens get migrated file-by-file)
```

## Phased migration

### Phase 0 — Foundations (this PR / session)
- **P0.1** `lib/theme/*` with light + dark tokens ported from `apps/web/app/globals.css`
- **P0.2** `components/ui/{Screen,Card,Button,Badge,Text,Icon,ProgressBar}`
- **P0.3** Install `lucide-react-native`
- **P0.4** Refactor `(client)/_layout.tsx` tab bar — lucide icons, themed colors
- **P0.5** Refactor `(client)/today.tsx` end-to-end as the reference implementation

**Acceptance**: Today screen and tab bar look like web in both light and dark mode; no hex literals remain in the two migrated files; TS compiles.

### Phase 1 — Client tab surfaces
- **P1.1** `metrics.tsx` — migrate cards, sparklines, primary color
- **P1.2** `habits.tsx` — habit rows, progress bars, pill states
- **P1.3** `messages/index.tsx` — thread list with avatars + presence
- **P1.4** `messages/[threadId].tsx` — chat bubbles using `--primary` / `--muted`
- **P1.5** `profile.tsx` — settings rows, destructive sign-out

**Acceptance**: All 5 primary tabs use only tokens + primitives. Dark mode parity.

### Phase 2 — Detail & modal surfaces
- **P2.1** `log/[instanceId].tsx` — workout logger (highest UI density, most work)
- **P2.2** `metric/[metricId].tsx` — metric detail + entry
- **P2.3** `notifications.tsx`
- **P2.4** `ExerciseVideoModal` — card chrome + themed buttons

### Phase 3 — Auth + polish
- **P3.1** All four `(auth)` screens — shared auth layout with `OwlLogo` hero + gradient primary button
- **P3.2** Add `anim-fade-up` equivalent (`Animated.View` with 320ms translateY) to screen mounts
- **P3.3** RTL audit — every `marginLeft`/`paddingLeft` becomes `marginStart`/`paddingStart`
- **P3.4** Accessibility pass — accessibilityRole, min 44×44 hit slops, Dynamic Type friendly text styles

### Phase 4 — Nice-to-haves
- **P4.1** Shared `@coaching/design-tokens` package so web + mobile literally import the same token source
- **P4.2** Storybook-on-device (or Expo Router `dev/` route) to browse primitives
- **P4.3** Haptics on button press (iOS) via `expo-haptics`
- **P4.4** Skeleton shimmer component matching web `.skeleton-shimmer`

## Token translation (web → mobile)

Web uses CSS `oklch()` which React Native can't consume directly. The mobile `colors.ts` ports each token to the closest hex / rgba:

| Web token        | Light                  | Dark                   |
|------------------|------------------------|------------------------|
| `--brand-600`    | `#5E4CB5` (primary)    | —                      |
| `--brand-400`    | —                      | `#9889E8` (dark primary) |
| `--background`   | `#FBFAFD`              | `#1B1A22`              |
| `--foreground`   | `#232234`              | `#EEECF2`              |
| `--card`         | `#FFFFFF`              | `#25242E`              |
| `--border`       | `#E8E6ED`              | rgba(160,158,172,0.35) |
| `--muted-fg`     | `#74727E`              | `#A8A6B2`              |
| `--success`      | `#38A87A`              | `#4BBE8E`              |
| `--warning`      | `#E3A948`              | `#F0BA5A`              |
| `--destructive`  | `#D64A3B`              | `#EA5A4B`              |
| `--accent-500`   | `#E0A93D` (amber)      | —                      |

Exact values live in `lib/theme/colors.ts`. The conversion is eyeballed from OKLCH; if the visual match isn't tight enough we can use a real OKLCH→sRGB conversion at build time later.

## Out of scope for now

- No changes to data fetching, stores, or navigation structure
- No screen restructuring — migration is style-only, behavior is preserved
- No shared-package extraction yet (Phase 4)
- No new features

## Deliverables produced in this pass

1. This document
2. `lib/theme/` with tokens + `useTheme` hook
3. `components/ui/` primitives (Screen, Card, Button, Badge, Text, Icon, ProgressBar)
4. Tab bar refactored with lucide icons
5. `today.tsx` refactored end-to-end as the pattern to follow
6. `package.json` updated with `lucide-react-native`

Remaining screens are tracked as tasks in the session task list and as Phase 1–3 above.
