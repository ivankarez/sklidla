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

## What it does today

- **Dashboard / ledger:** big calorie count, macro progress bars, daily history
- **Water tracking:** optional dashboard water counter with configurable +/- step sizes
- **Activity logging:** add walking, running, cycling, or other activities and optionally count 0%, 50%, or 100% of burned calories toward your daily target
- **Food library:** search foods, edit foods, add foods manually
- **Serving sizes:** store units like slices, scoops, cups, pieces
- **Meal logging:** pick a food, set amount/unit, save hard macros to the log
- **Immutable history:** old log entries keep the saved macro totals even if the base food changes later
- **Camera flows:** scan a meal photo or nutrition label, then verify before saving
- **Macro setup:** onboarding includes a calculator for calorie and macro goals
- **Weight tracking:** current weight lives in your profile and gets charted over time in Stats
- **Settings vault:** theme, goals, AI toggle, provider choice, and encrypted local key storage

## Privacy model

Sklidla is built around **local-first storage**:

- food data, water logs, activity logs, settings, and nutrition logs are stored in **SQLite**
- API keys are stored in **`expo-secure-store`**
- there is **no project backend**
- AI calls go straight from your device to the provider you choose

If you never turn on AI, Sklidla still works as a manual nutrition tracker.

## Privacy policy for Google Play

Sklidla includes a Markdown privacy policy at **`docs/privacy-policy.md`**.

For Google Play submission:

1. Use the public URL of that file in Google Play Console, for example the GitHub file page for `docs/privacy-policy.md`.
2. If you prefer, you can also host that Markdown file through GitHub Pages or any other public domain.
3. Keep the Play disclosures aligned with the app's actual behavior:
   - camera access is used for meal and nutrition-label scanning
   - food logs, water logs, food library data, settings, and goals stay local on-device
   - API keys are stored with `expo-secure-store`
   - AI scans may send image data directly to the user-selected provider (OpenRouter, OpenAI, or Gemini)
   - there is no Sklidla project backend relaying those requests

## AI, but not in a creepy way

AI is optional. When enabled, it helps with:

- **plate scans** for rough macro estimates
- **label scans** for OCR-style nutrition extraction
- **manual-entry autofill** when you know the food name but not the full numbers

### Supported today

- **OpenRouter**
- **OpenAI**
- **Gemini**


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

### 4. Run the tests

```bash
npm test
```

### 5. Run the manual AI provider integration tests

These do **real provider calls** and are intentionally **not** part of `npm test`.

1. Copy the env template and fill in your keys:

```bash
cp .env.example .env
```

2. Run the manual suite:

```bash
npm run test:ai:integration
```

Notes:

- required env vars: `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`
- the suite exercises both the text-only autofill flow and the vision flow in `utils/ai.ts`
- the committed vision smoke fixture lives in `tests/fixtures/ai-provider/vision-smoke.jpg`
- these checks validate real provider wiring and structured outputs, not provider-to-provider nutrition exact-match parity

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
