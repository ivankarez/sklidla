# Sklidla Privacy Policy

Last updated: 2026-04-19

Sklidla is a local-first nutrition tracker. Most of your data stays on your device unless you deliberately use an AI-powered feature.

This policy explains what the app stores locally, when scan images may leave the device, and what to tell Google Play about camera and AI processing.

## What Sklidla stores on your device

Food entries, meal logs, serving sizes, and most app settings are stored locally in SQLite on your device.

API keys for supported AI providers are stored on-device with `expo-secure-store` instead of in the normal app database.

- Food library entries and serving sizes
- Logged meals and saved macro totals
- Macro goals and app preferences
- Encrypted AI provider API keys

## Camera and photos

Sklidla requests camera access so you can scan meal photos and nutrition labels inside the app.

The app only uses camera access for the scan flows you start yourself.

- Meal photos for macro estimation
- Nutrition label photos for OCR-style extraction

## When images may leave your device

AI features are optional. If you do not enable them or do not use the scan/autofill flows, Sklidla does not send your images to an AI provider.

When you use AI scanning or AI autofill, the relevant image or prompt data is sent directly from your device to the provider you selected in Settings.

Supported providers currently include OpenRouter, OpenAI, and Gemini. Those providers process requests under their own terms and privacy policies.

- There is no Sklidla project backend relaying scan images
- Requests go straight from the app to the provider you choose
- You control whether AI is enabled and which provider is used

## Data sharing and retention

Sklidla does not operate its own backend for food logs, settings, or API keys.

Because AI requests go directly to third-party providers, retention and processing for those requests are controlled by the provider you selected.

- Local logs remain on your device unless you delete them
- Deleting app data removes local SQLite data and stored keys from the device
- Provider-side retention is governed by the provider you chose

## Your choices and controls

You can use Sklidla as a manual nutrition tracker without enabling AI.

You can disable AI, remove your API key, deny camera access, or delete all local data from Settings at any time.

- Turn AI features on or off
- Choose your AI provider
- Remove stored API keys
- Delete all local app data

## Google Play disclosure notes

For Google Play listing disclosures, describe camera access as required for meal and nutrition-label scanning.

Describe data handling plainly: local food logs and settings stay on-device, while AI scans may send image data directly to the selected AI provider.
