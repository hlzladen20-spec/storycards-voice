# StoryCards Voice

A Windows desktop app for short English voice conversations and personally generated flashcards. The interface remains compact and phone-like, but runs in its own application window.

## What it does

- starts a browser WebRTC voice conversation with OpenAI Realtime;
- records displayed learner and coach transcripts in the browser session;
- turns the conversation into 5–15 German-to-English cards after the session;
- stores cards locally on the device and brings missed/due cards to the front.

## Start the desktop app

Use Node.js 20 or newer. Set `OPENAI_API_KEY` only in the server environment, then run:

```sh
npm install
npm run desktop
```

The app opens in its own Windows window. Microphone access is requested there.

To create a Windows installer (`.exe`), run:

```sh
npm run dist:win
```

The installer is written to `dist/`. `OPENAI_API_KEY` must be available as an environment variable when the application starts; it is never bundled in the app.

## Handy-App für Android und iPhone

Die Web-Version ist als installierbare Handy-App vorbereitet. Nach dem Render-Deployment die HTTPS-Adresse auf dem Handy öffnen:

- **Android (Chrome):** im Browsermenü **„App installieren“** oder den Knopf **„App installieren“** in StoryCards Voice wählen.
- **iPhone (Safari):** **Teilen** → **„Zum Home-Bildschirm“** wählen.

Die Karten bleiben auf dem jeweiligen Gerät gespeichert. Die Sprachübung braucht während des Gesprächs eine Internetverbindung.

## Web-Deployment zu Render

1. Push this repository to GitHub.
2. In Render, create a new Blueprint from the repository; it reads `render.yaml`.
3. Add `OPENAI_API_KEY` as a secret environment variable in Render. Do not add it to GitHub, browser code, or a `.env` file committed to the repo.
4. Deploy and open the HTTPS URL on a phone.

The local app server exchanges the WebRTC offer with OpenAI. The standard API key never reaches the renderer (the app's interface). Render remains optional if you also want a browser version.
