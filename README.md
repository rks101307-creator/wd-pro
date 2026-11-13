# NutriTrack AI

A local nutrition and activity tracker with optional AI chat and food photo analysis.

## Start the app

1. Install [Node.js](https://nodejs.org/).
2. Open a terminal in this folder and run `npm install` once.
3. Run `npm start`, or double-click `start.bat` on Windows.
4. Open <http://localhost:3000>.

AI features are optional. To configure them, copy `.env.example` to `.env` and set your Groq API key and model names. Restart the server after changing `.env`.

## Project layout

- `public/` — HTML pages and browser assets (`css/`, `js/`)
- `routes/` — Express API routes
- `services/` — storage, nutrition calculations, shared helpers, and AI client
- `middleware/` — Express middleware
- `database/` — local JSON data, created or updated as the app runs
- `server.js` — application entry point
