# Gemini AI Documentation & Project Context

This document serves as the central intelligence log for the **Smart AI Macro Tracker**. It outlines the AI architecture, technical decisions, and future development vectors.

---

## 🛰️ AI Architecture (Gemini 1.5 Pro)

The application leverages **Gemini 1.5 Pro** via a Vercel Serverless Function (`/api/analyze.ts`) for high-precision food logging and image telemetry.

### Core Capabilities
- **Multi-Modal Analysis**: Processes both natural language (Czech/English) and photographic input.
- **Brand Intelligence**: Integrated with **Google Search** to retrieve exact nutritional data for specific product brands (e.g., "Gustavo Gusto pizza").
- **Dynamic Interrogation**: If a request is fundamentally unparseable, the AI generates a "Clarification" response with context-aware options.
- **Graceful Assumptions**: If an entry is ambiguous (e.g., "1 bowl of soup"), the AI makes a statistically likely guess and flags it for user review (`requiresReview: true`).

### Prompt Engineering Logic
The model is instructed to act as a **brutally efficient military/sci-fi telemetry module**.
- **Standard Title Format**: `*SingleWordTitle* Original input or assumed serving WITH METRICS`.
- **Metric Requirement**: All descriptions MUST include approx grams (g) or milliliters (ml).
- **Brutalist Format**: Strict JSON object output only; no conversational filler.

---

## 🧠 Core Skills & Intelligence

The module is equipped with specialized logistical skills to ensure data integrity and user convenience:

### 1. Multi-Modal Vision
Can interpret pixel-data from food photos, identifying ingredients, cooked meals, and even nutrition labels. It cross-references visual cues with text input for maximum accuracy.

### 2. Live Brand Retrieval
The AI's most advanced skill. When a brand is mentioned, it halts standard estimation and performs a **Google Search** to pull manufacturer-provided data (Kcal, Macros).

### 3. Contextual Interrogation
The module knows when it's beat. Instead of guessing wildly on unparseable data, it triggers a red "Interrogation" UI, providing the user with context-aware buttons to resolve the ambiguity.

### 4. Smart Recursive Calculation
Using the **Mifflin-St Jeor** skill-set, the AI can automatically recalculate an entire food entry's macros if the user manually changes the weight or title, maintaining nutritional coherence.

### 5. Multi-Lingual Fluency
Natively understands and parses Czech and English inputs, translating them into the standardized English internal data format while preserving the user's original intent in the description.

---

## 🛠️ Project Context & Logic

### Tech Stack
- **Frontend**: React 19 + Vite (PWA enabled)
- **Styling**: Tailwind CSS (Brutalist High-Contrast Design System)
- **Animations**: GSAP (Biometric/Scanning effects)
- **Icons**: Lucide React
- **Backend / DB**: Supabase (Auth + Realtime Database)
- **deployment**: Vercel

### Nutritional Biometrics
The app uses the **Mifflin-St Jeor** formula to calculate the Basal Metabolic Rate (BMR):
- **Male**: $BMR = 10w + 6.25h - 5a + 5$
- **Female**: $BMR = 10w + 6.25h - 5a - 161$

**TDEE Calculation**:
Targets are adjusted via a **Physical Activity Level (PAL)** slider:
1. **Desk Life** (1.20)
2. **Walker** (1.375)
3. **Grinder** (1.55)
4. **Beast** (1.725)

**Goal Modifiers**:
- **Shred (Cut)**: TDEE × 0.80 | 2.0g Protein/kg
- **Recomp (Maintain)**: TDEE × 1.00 | 1.8g Protein/kg
- **Titan (Bulk)**: TDEE × 1.15 | 1.6g Protein/kg

---

## 📓 Developer Notes & Technical Debt

### Current Known Limitations
- **Title Parsing**: UI components (`DailyLog`, `SmartLogging`) rely on Regex to split the `*Title*` from the description. Changing the AI prompt's separator requires manual updates across multiple files.
- **Favorite Keys**: Favorites are currently keyed by name in the store. Duplicate names or minor edits can cause key collisions.
- **Type Safety**: The API route currently uses permissive `any` types for request/response payloads.

### Future Development Vectors
- [ ] **Voice Intelligence**: Move from browser-native Web Speech API to model-based transcription for better recognition of food names.
- [ ] **Recipe Synthesis**: Allow the AI to "save as recipe" when multiple ingredients are logged together.
- [ ] **Advanced Trends**: Implement GSAP charts for 7-day macro and weight delta visualizations.
- [ ] **Social Telemetry**: Optional "Squad" views to compare targets with other users.

---

*End of Log.*
