<p align="center">
  <img src="./assets/images/logo-round.png" alt="Sklidla logo" width="160" height="160" />
</p>

<h1 align="center">SKLIDLA</h1>

<p align="center"><strong>A privacy-first calorie tracker for Android with optional BYOK AI.</strong></p>

<p align="center">
  Fast logging. Local storage. No creepy backend. No subscription treadmill.
</p>

---

Sklidla is an open-source nutrition tracker built for people who want **less friction** and **less surveillance**.

It stores your data locally, keeps API keys on-device, and treats AI as an optional power tool instead of the whole business model. Snap a meal, scan a label, fix the numbers, save the log, move on with your life.

## Why this exists

Most nutrition apps feel clinical, bloated, or weirdly eager to own your data.

Sklidla is trying a different approach:

- **Privacy first:** food logs live in local SQLite on your device.
- **BYOK AI:** you bring your own API key, so there is no server middleman and no forced subscription.
- **Fast correction flow:** AI can guess, but you still get the final say before anything lands in your log.
- **Open source:** inspect it, fork it, break it, improve it.

## Current status

Sklidla is currently an **Android alpha / early preview**.

| Area | Status |
| --- | --- |
| Android | Primary target |
| iOS | Not part of the current release plan |
| Web | Not part of the current release plan |
| Local food library | Working |
| Manual logging | Working |
| Meal scan flow | Working |
| Nutrition label scan flow | Working |
| Optional AI autofill | Working |
| Direct OpenRouter / OpenAI support | Working |
| Direct Gemini support | Working |
| Direct Claude provider support | Not wired yet |

## What it does today

- **Dashboard / ledger:** big calorie count, macro progress bars, daily history
- **Food library:** search foods, edit foods, add foods manually
- **Serving sizes:** store units like slices, scoops, cups, pieces
- **Meal logging:** pick a food, set amount/unit, save hard macros to the log
- **Immutable history:** old log entries keep the saved macro totals even if the base food changes later
- **Camera flows:** scan a meal photo or nutrition label, then verify before saving
- **Macro setup:** onboarding includes a calculator for calorie and macro goals
- **Settings vault:** theme, goals, AI toggle, provider choice, and encrypted local key storage

## Privacy model

Sklidla is built around **local-first storage**:

- food data, settings, and logs are stored in **SQLite**
- API keys are stored in **`expo-secure-store`**
- there is **no project backend**
- AI calls go straight from your device to the provider you choose

If you never turn on AI, Sklidla still works as a manual nutrition tracker.

## AI, but not in a creepy way

AI is optional. When enabled, it helps with:

- **plate scans** for rough macro estimates
- **label scans** for OCR-style nutrition extraction
- **manual-entry autofill** when you know the food name but not the full numbers

### Supported today

- **OpenRouter**
- **OpenAI**

### Not fully implemented yet

- **Claude direct provider**

Claude is not yet wired as a direct provider in the app. Gemini direct provider is now implemented; see settings for how to provide a Google AI Studio API key.


## Tech stack

- **Expo / React Native**
- **Expo Router**
- **TypeScript**
- **SQLite** via `expo-sqlite`
- **Secure key storage** via `expo-secure-store`
- **Expo Camera**
- **NativeWind / Tailwind-style utilities**

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the app for Android

```bash
npm run android
```

If you want the Metro server without launching Android immediately:

```bash
npm start
```

### 3. Optional: run lint

```bash
npm run lint
```

## Project structure

| Path | What lives there |
| --- | --- |
| `app/` | Expo Router screens and navigation |
| `db/` | SQLite setup and data access |
| `src/` | shared UI primitives and components |
| `utils/ai.ts` | AI provider calls, prompt shaping, response sanitizing |
| `assets/images/` | app branding and logo assets |

## Open-source launch notes

This repo is being positioned as an **Android-first open-source app**, not a polished cross-platform product page pretending everything is done.

A few honest notes:

- Android is the only release target right now.
- Some Expo config for iOS/web still exists because the app is built on Expo, but that is not the current public release focus.
- The app has strong core flows already, but this is still early-stage software.
- AI output is always something the user should verify before trusting blindly.

## Roadmap-ish

Near-term work that would make Sklidla meaner, faster, and more useful:

- tighten the camera-to-verification flow
- improve README visuals with screenshots or a short demo GIF
- finish direct Claude provider support or remove the placeholders
- polish Android release packaging
- keep reducing friction in food creation and logging

## Contributing

Contributions are welcome, especially if you want to help with:

- Android UX polish
- local-first data modeling
- AI extraction reliability
- README/docs cleanup
- accessibility and performance

If you open an issue or PR, clarity beats hype.

## License

Planned for **MIT**.

If the repository license file has not landed yet, the README is reflecting the intended launch license.

---

<p align="center">
  <strong>LOG WHAT YOU ATE.</strong><br />
  <em>Keep your data. Keep your keys. Keep moving.</em>
</p>
