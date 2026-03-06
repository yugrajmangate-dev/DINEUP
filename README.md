# DineUp

DineUp is a premium, hyper-local restaurant discovery and reservation concept built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Mapbox GL, and Lucide React.

## Included UI Deliverables

- Expressive minimalist dark-mode shell with floating glass navigation
- Split-screen restaurant discovery flow with a bento feed and sticky live map
- Animated custom pins that respond to card hover state
- Baymax AI gastronomy assistant with spring-driven glass chat UI
- Live geolocation with proximity-based feed sorting around Pune
- Glassmorphic reservation modal with animated confirmation flow
- Streaming AI backend powered by the Vercel AI SDK and OpenAI
- Firebase Authentication (Google OAuth + Email/Password) with glassmorphic sign-in/sign-up modal
- Persistent reservations saved to Cloud Firestore
- Agentic Baymax with tool-calling: `checkAvailability` and `initiateBooking` render interactive cards in the chat
- Protected "My Bookings" dashboard with bento-grid layout and animated cancel-to-delete

## Tech Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS 4
- Framer Motion
- react-map-gl + Mapbox GL JS
- AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`) v5 with tool calling
- Firebase (Auth + Cloud Firestore)
- Zustand (lightweight global state)
- Zod 4 (tool input schemas)
- clsx + tailwind-merge
- Lucide React

## Local Setup

1. Install dependencies:

	```bash
	npm install
	```

2. Add your environment variables:

	```bash
	cp .env.example .env.local
	```

	Set the following in `.env.local`:
	- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox public token (optional; without it the map renders a fallback)
	- `GROQ_API_KEY` — Groq API key for Baymax streaming + tool calling
	- `GROQ_MODEL` — model name (defaults to `openai/gpt-oss-20b`)
	- `NEXT_PUBLIC_FIREBASE_*` — Your Firebase configuration keys

    *See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup and collaboration guidelines.*
	- `NEXT_PUBLIC_FIREBASE_*` — six Firebase config values from Firebase Console → Project settings

3. Start the development server:

	```bash
	npm run dev
	```

## Notes

- Without `NEXT_PUBLIC_MAPBOX_TOKEN`, the map panel renders a designed fallback preview instead of the live Mapbox canvas.
- Without `OPENAI_API_KEY`, the Baymax route returns a clear setup error in the chat window.
- Remote restaurant photography is loaded from Unsplash via the image allowlist in [next.config.ts](next.config.ts).

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run start`
