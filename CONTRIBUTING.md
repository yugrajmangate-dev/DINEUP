# Contributing to DineUp

Welcome down the rabbit hole! Thank you for considering contributing to DineUp. This project is built on the philosophy of creating a "World-Class" UI and delivering a seamless developer experience (DX). 

Whether you're fixing bugs, adding animations, or improving our agentic AI (Baymax), this guide will get you set up and submitting your first Pull Request in no time!

---

## Prerequisites

Before setting up the project locally, please ensure you have the following installed:

- **[Node.js](https://nodejs.org/en/)** (v20+ recommended)
- **[Git](https://git-scm.com/)**
- A **package manager** locally configured (NPM is perfectly fine).

---

## Local Setup Steps

Follow these steps to replicate the production environment on your machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yugrajmangate-dev/DINEUP.git
   cd DINEUP
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the Environment Variables:**
   You will need to construct your own integrations to allow the app to boot successfully. We use a `.env.example` file that tracks the required schema.

   ```bash
   cp .env.example .env.local
   ```

### Obtaining Your API Keys

Please configure `.env.local` meticulously with your own keys:

- **TomTom API Key:** Required to render the beautiful live maps. Sign up [here](https://developer.tomtom.com/) and grab a free API key, then set `NEXT_PUBLIC_TOMTOM_API_KEY`.
- **AI Provider Key:** Baymax supports OpenAI-compatible providers. Set `AI_PROVIDER` to `groq` or `minimax`.
   - If using Groq, configure `GROQ_API_KEY`, `GROQ_MODEL`, and optional `GROQ_FALLBACK_MODELS`.
   - If using MiniMax, configure `MINIMAX_API_KEY`, `MINIMAX_MODEL`, optional `MINIMAX_FALLBACK_MODELS`, and optional `MINIMAX_BASE_URL`.
- **Firebase Configuration:** You must orchestrate your own Firebase backend for Authentication and Firestore. Go to the [Firebase Console](https://console.firebase.google.com/), construct a Web App, and populate:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`

> **Note:** We have put safe-guards in place! If your Firebase keys aren't formatted correctly, the application will simply console.warn the failure instead of throwing UI crashes, allowing you to build the UI decoupled from the DB.

4. **Launch the development server:**
   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) directly and dive in!

---

## Code Quality & Commit Standards

- **Formatting:** We utilize strict `eslint` and `prettier` config. Run `npm run lint` before committing.
- **Git Flow:** Please create feature branches `feat/$YOUR_FEATURE` and write conventional commit messages (e.g., `feat: added Framer Motion hover states to dashboard`).
- **State Management:** When touching `store/`, ensure any UI implementations reading `Zustand` state account for React 19 hydration (use `mounted` state check before rendering auth checks).

Let's build something world-class together!
