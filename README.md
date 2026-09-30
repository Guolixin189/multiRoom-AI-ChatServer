# Multi-Room AI Chat

A real-time multi-room chat app with an **AI assistant built into every room**. Pick a nickname, create or join a room, and chat instantly — or type `/agent` followed by a question to get an AI answer right in the conversation.

**Live demo:** https://multiroom-ai-chatserver.onrender.com

## Features

- **No sign-up** — just pick a nickname and enter the lobby
- **Multiple rooms** — create rooms with an optional password, or browse and join existing ones
- **Real-time messaging** via WebSockets (Socket.io), with typing indicators
- **🤖 `/agent` AI assistant** — ask the AI anything from inside any room (powered by OpenRouter free models)
- **User list** — see who's in the room, with per-user color avatars
- **Private DMs** — message any user directly
- **Room moderation** — the room creator can kick or ban users
- **Modern UI** — gradient theme, message bubbles, responsive layout (sidebar collapses on mobile)

## The `/agent` Command

`/agent` brings an AI assistant into the chat room. While everyone is chatting, anyone can ask it a question:

```
/agent what is the capital of Japan?
/agent explain recursion like I'm five
/agent give me three dinner ideas
```

How it works:

1. Type `/agent` followed by your question and hit Send (or Enter)
2. An "AI Agent is typing…" indicator appears
3. The AI's reply is posted into the room as a message from **AI Agent**, visible to everyone

Technical notes:

- The server forwards your prompt to the [OpenRouter](https://openrouter.ai/) chat-completions API
- Default model is `qwen/qwen3.8-27b:free` (free tier) — override it with the `OPENROUTER_MODEL` env var
- Requires an `OPENROUTER_API_KEY` (get a free one at [openrouter.ai/keys](https://openrouter.ai/keys))
- OpenRouter's free tier allows **50 requests/day per account**, shared across all your keys — and failed requests count too, so a busy room can burn through it
- If the AI is unreachable you'll see `AI Error: AI service unavailable.` — check the server logs for the underlying OpenRouter HTTP status

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Backend  | Node.js, Express, Socket.io             |
| Frontend | Vanilla HTML / CSS / JavaScript          |
| AI       | OpenRouter API (OpenAI-compatible)       |
| Hosting  | Render (backend + static frontend)       |

## Project Structure

```
chat/
├── chat-server.js      # Express + Socket.io server, /agent handler
├── package.json
└── public/
    ├── index.html      # Login / lobby / chat screens
    ├── main.js         # Socket.io client logic
    └── style.css       # Modern indigo/violet theme
```

## Run Locally

```bash
cd chat
npm install
```

Create a `.env` file (or export the vars directly):

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
# Optional:
# PORT=3457
# OPENROUTER_MODEL=qwen/qwen3.8-27b:free
```

Then:

```bash
npm start
```

Open http://localhost:3457 in your browser. Open a second tab/window with a different nickname to see multi-user chat in action.

> Without `OPENROUTER_API_KEY`, everything works except `/agent` (it will reply with an error).

## Deploy to Render

1. Push this repo to GitHub (or fork it)
2. In the [Render dashboard](https://dashboard.render.com/), click **New → Web Service** and connect the repo
3. Configure:
   - **Root Directory:** `chat`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Under **Environment**, add:
   - `OPENROUTER_API_KEY` = your key from https://openrouter.ai/keys
   - *(optional)* `OPENROUTER_MODEL` = e.g. `qwen/qwen3.8-27b:free`
5. Deploy — Render gives you a public `https://<your-service>.onrender.com` URL

Enable **Auto-Deploy on commit** (Settings → Build & Deploy) so every push to `main` redeploys automatically. (This requires connecting the repo via your GitHub account, not the "public repo URL" option.)

> Render's free tier sleeps after ~15 minutes of inactivity — the first request after sleep takes ~30–60 seconds to wake the server (cold start). This is normal.

## Environment Variables

| Variable            | Required | Default                    | Description                              |
|---------------------|----------|----------------------------|------------------------------------------|
| `OPENROUTER_API_KEY`| Yes*     | —                          | OpenRouter API key for `/agent`          |
| `OPENROUTER_MODEL`  | No       | `qwen/qwen3.8-27b:free`    | Model used by `/agent`                   |
| `PORT`              | No       | `3457`                     | Port the server listens on               |

\* Only required for `/agent`; the rest of the app works without it.

## Usage Guide

1. **Log in** — enter any nickname and click Enter Lobby
2. **Lobby** — create a room (optionally password-protected) with *Create & Join*, or join an existing room from the list (🔒 = password required)
3. **Chat** — type and hit Send (or Enter); you can see when others are typing
4. **Users panel** — hover a user to DM them privately; if you created the room you can also Kick/Ban
5. **AI** — type `/agent <question>` any time to ask the AI assistant
6. **Leave** — Leave Room returns you to the lobby; Logout returns to the login screen

## Notes & Limitations

- Chat history and room state are **in-memory** — they reset when the server restarts. (Fine for demos; a production version would add a database.)
- Free-model availability on OpenRouter changes over time — if `/agent` starts failing with no code changes, check that the configured model still exists in [OpenRouter's model list](https://openrouter.ai/models).
- The unused `@google/generative-ai` dependency in `package.json` is a leftover from the original class project.

## Background

This project started as a CSE3300 (Web Development) course project, originally deployed on a class EC2 instance with a local Ollama model. It has since been migrated to Render + OpenRouter so it runs entirely on free-tier cloud services with no server maintenance.
