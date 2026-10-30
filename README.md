# ✦ GAMEFORGE — Infinite Game Alchemy

A complete, responsive browser game about **combining video-game concepts**. Inspired by the elemental-discovery gameplay of Little Alchemy, but with an original gaming theme, crafting interface, and progression.

## Features

- 12 starting ingredients, **250+ handcrafted combinations**, and a limitless procedural fallback for unlisted pairs.
- Recognizable video-game-related discoveries alongside fictional games, mechanics, and worlds.
- Optional **real AI-generated combinations** through an OpenAI-backed serverless API.
- Discoveries become ingredients for future crafts; ingredient order does not matter.
- Rare, epic, legendary items, achievements, hint system, collection, search and sorting, recipe book.
- Responsive dark/glass interface, particle celebration, subtle animations and sound effects.
- Autosave in browser localStorage, JSON save import/export, accessible reduced-motion preference.
- No frontend libraries, dependencies, accounts, databases or build step.

## Play locally

Open `index.html` in a modern browser. For a local server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Publish free with GitHub Pages

1. Create a **public GitHub repository** for the game and upload all root files, including `.github/workflows/deploy.yml` (or use the already-committed files).
2. Go to repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Open **Actions** and run “Deploy GameForge to GitHub Pages” if it has not run automatically.
4. The site URL is shown under Settings → Pages, normally `https://USERNAME.github.io/REPOSITORY/`.

The GitHub Pages version works **immediately without any API key**, using handcrafted recipes and local procedural generation. GitHub Pages alone cannot securely execute the server-side AI function.

## Enable actual AI generation (optional)

The repo includes a Vercel-compatible API endpoint at `api/combine.js`.

1. Import the GitHub repository in [Vercel](https://vercel.com/new) as an **Other** / no-framework project. Keep root directory `.` and do not set a build command. (If you imported it as a subdirectory, set that directory as project root.)
2. Add an environment variable **`OPENAI_API_KEY`** with your OpenAI API key **in Vercel's environment settings only**. Do not put your key in client JavaScript or commit it to GitHub. OpenAI API usage is billed separately from ChatGPT subscriptions.
3. Optionally set `OPENAI_MODEL=gpt-4.1-mini` and `ALLOWED_ORIGINS=https://USERNAME.github.io,https://YOURDOMAIN.com` (comma-separated origins without trailing slashes).
4. Deploy, then either play the Vercel site directly (AI endpoint automatically detected at `/api/combine`) or, on your GitHub Pages site, use **Settings → Creative AI Engine → API Endpoint** and enter `https://YOUR-PROJECT.vercel.app/api/combine`.

The game always checks curated recipes first. Other combinations request your AI server when configured. If it is unavailable or reaches a timeout, an offline generative fallback continues the game.

**Important:** Public AI endpoints consume paid API credits. This demo includes a best-effort per-instance throttle (25 requests/hour/IP), but **serverless instances do not share that limit**. For a widely accessible public launch, configure durable rate limiting, budget limits, bot/abuse protection and origin allowlisting before enabling a paid API.

## Controls

- **Click** elements twice (same or different) or **drag** into the two fusion slots.
- **Enter** to forge, **/** to search elements, **H** for a hint, **Esc** to close dialogs.
- Use Settings to toggle sound, animations, save export/import and AI endpoint.

## Stack

HTML + CSS + vanilla JavaScript; Node.js Vercel serverless function (optional). Original game concept and UI created for this project. Names of real video games are used only as thematic discovery references; this game is not affiliated with their publishers.
