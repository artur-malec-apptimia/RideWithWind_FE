# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR at http://localhost:5173
npm run build     # Build for production (outputs to dist/)
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## Architecture

Single-component React + Vite SPA. All logic lives in `src/App.jsx`:

- User inputs a city name, which is sent to a backend at `http://localhost:8000/weather?city={city}`
- Response data (temperature, pressure, humidity, wind speed/direction) is rendered inline
- Wind direction degrees are converted to compass labels via `getWindDirection()`
- Weather icons are loaded from OpenWeatherMap's CDN using the icon code returned by the API

The backend at `http://localhost:8000` must be running separately — this repo is frontend-only.

## Notes

- React 19, Vite 8, ESLint 9 (flat config format)
- No TypeScript (types packages are installed but unused)
- `App.css` exists but is not used by the current component
