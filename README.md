# Red Remodels Test Environment

This repository contains the static assets for the Red Remodels marketing website. A lightweight Node-based development server is included so you can preview the site locally without installing any global tooling.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer (any runtime that supports ES modules will work)

## Getting Started

```bash
npm install
npm start
```

The `npm install` step is a no-op because the project has no external dependencies, but it ensures Node initialises the project and records the lockfile if one is generated in the future.

The `npm start` command launches a static file server on port `4173`. Once running, open your browser to:

```
http://localhost:4173/Pages/desktop/home/
```

The server automatically redirects the root path (`/`) to the desktop home page, so visiting `http://localhost:4173/` also works.

## Customisation

Environment variables let you adapt the server without changing code:

- `PORT`: change the port (defaults to `4173`).
- `HOST`: override the bind address (defaults to `0.0.0.0`).
- `DEBUG`: set to any truthy value to log missing file requests to the console.

Example:

```bash
PORT=8080 npm start
```

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running to stop it.
