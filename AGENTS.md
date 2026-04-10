# Project Sklidla: Master Blueprint

## 1. The Manifesto & Vibe
Sklidla is an open-source, privacy-first, blazing-fast nutrition tracker. It is built to kill the friction of manual calorie counting by using AI vision models. 

It rejects the sterile, clinical, "medical app" aesthetic of current market leaders. Sklidla is loud, unhinged, and chaotic. 
* **Aesthetic:** Black-and-white high-contrast minimalism. Clean geometry, hard divisions, solid fills, strict spacing, sharp edges, and zero decorative fluff.
* **Palette:** Pure White (#FFFFFF), Deep Black (#000000), and grayscale only when absolutely necessary for hierarchy. Contrast should come from solid fills, inversion, and weight rather than color.
* **Typography:** Monospace only. Heavy, rigid headers and compact terminal-style body text for stats, labels, and system messages. Massive, aggressive numbers.
* **Iconography:** Filled logos and solid glyphs only. No thin outlines, gradients, skeuomorphism, or soft effects.
* **Copywriting:** "Unhinged Supportive." Clear first, weird second. Write like a funny person, not a slogan generator. Prefer "YOU DID THE THING." over "Goal Reached" and "LOG WHAT YOU ATE" over "Log Food". Never call food "fuel."

## 2. Core Tech Architecture
* **Frontend Framework:** React Native via Expo.
* **Local Database:** SQLite (`expo-sqlite`). 100% offline-first, private data storage.
* **Security:** `expo-secure-store` to lock API keys safely in the device's keychain/keystore.
* **AI Engine:** Bring Your Own Key (BYOK) architecture. Users supply their own API keys (OpenRouter, OpenAI, Gemini) to process images. Zero server costs for the project.

## 3. Key Functionalities
* **The Plate Scanner:** Snap a photo of a meal. AI identifies the components and returns a JSON payload of base macros. The user verifies and adjusts the quantity via a massive visual slider before logging.
* **The Label Parser:** Snap a photo of a nutrition label. AI uses OCR to instantly map the text to standard macro fields (Calories, Protein, Carbs, Fats) to create a new food entry in the database.
* **Alternative Serving Sizes:** The system maps abstract units (e.g., "1 whole banana", "1 scoop") to standard gram weights, allowing the AI and user to log quickly without always thinking in grams.
* **Immutable History:** When a user logs a meal, the hard macros are calculated and saved to that specific log. If they edit the base food in the database later, past logs remain perfectly intact.

## 4. Database Schema Structure
1.  **`foods`:** The core library holding normalized 100g baseline data (id, name, brand, macros_per_100g).
2.  **`serving_sizes`:** Relational table mapping alternative units to a food (e.g., Food ID: 5, Name: "slice", Weight: 30g).
3.  **`logs`:** The daily diary. Stores the specific `food_id`, the amount eaten, the `serving_size_id` (if not raw grams), and the *hardcoded total macros* at the time of logging.
4.  **`settings`:** Simple key-value store for preferences like daily macro targets. (Note: API keys do *not* go here, they go in SecureStore).

---

## 5. Screen Architecture & Navigation Flow

### A. Dashboard Screen (The Hub)
* **Purpose:** The central command center showing daily progress and quick actions.
* **Elements:**
    * Massive, aggressive numbers showing current total calories vs. daily goal.
    * High-contrast, chunky progress bars for Protein, Carbs, and Fats.
    * A stark, ledger-like list of today's eaten foods below the macros with hard separators and no ornament.
    * **Primary Action:** A massive, pulsing "RECORD" or "FEED" button anchored to the bottom.
* **Relations:** Tapping the main button opens the **Log Action Sheet / Hub**.

### B. Log Action Sheet (Modeless Overlay)
* **Purpose:** Quick routing to how the user wants to log.
* **Elements:** Large filled buttons for: "Snap Meal", "Scan Label", "Search DB", "Manual Entry".
* **Relations:** Routes to **Camera Screen**, **Search Screen**, or **Manual Entry Screen**.

### C. High-Contrast Camera Screen
* **Purpose:** Taking pictures of plates or labels.
* **Elements:** Custom UI that looks like a stripped-down targeting overlay with bold black and white framing, solid status blocks, and minimal capture chrome. A simple inverted loading state ("AI IS THINKING...") is triggered upon snapping.
* **Relations:** Passes the image to the AI. On success, routes to the **Verification & Adjustment Screen** (for meals) or **Food Detail Screen** (for labels).

### D. Verification & Adjustment Screen (The Core Interaction)
* **Purpose:** Correcting the AI's guess before saving to the DB.
* **Elements:**
    * Readout of what the AI detected.
    * **The Weight Bar:** A massive horizontal slider to dial in the weight, rendered as a filled black track against a white field.
    * **Unit Toggle:** A hard-switch selector next to the slider to swap between "Grams" and parsed alternative servings ("pieces", "scoops").
    * Giant "SAVE TO LOG" button.
* **Relations:** Hitting save writes to the `logs` table and boots the user back to the **Dashboard Screen**.

### E. Food Detail / Manual Entry Screen
* **Purpose:** Viewing, editing, or creating a new food in the database.
* **Elements:**
    * Monospace, black-and-white text inputs for Name, Brand, Calories, Protein, Carbs, Fats (per 100g), using filled labels and strict dividers.
    * Section to add/edit custom serving sizes (e.g., "Add '1 cup' = 120g").
* **Relations:** Triggered via the **Label Parser** or **Search Screen**. Saves write to the `foods` and `serving_sizes` tables.

### F. Search / Library Screen
* **Purpose:** Finding existing foods for quick manual logging.
* **Elements:** A high-contrast search bar with inverted focus states. List of results with one-tap adding.
* **Relations:** Tapping a food routes to the **Verification & Adjustment Screen** to set the portion size.

### G. The Hacker Vault (Settings Screen)
* **Purpose:** Configuring goals and handling BYOK credentials.
* **Elements:**
    * Input fields for aggressive daily Macro Goals.
    * **API Connectors:** Locked-down monospace input fields with filled service logos for pasting OpenAI, OpenRouter, or Gemini keys.
* **Relations:** Accessible from the **Dashboard Screen**. Saves keys to `expo-secure-store` and goals to the `settings` table.
