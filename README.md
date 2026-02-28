# EzIPTV

A free, open-source IPTV player built as a Progressive Web App. Browse Live TV channels, Movies, and Series from any Xtream Codes-compatible provider -- entirely in your browser.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack) |
| UI | **React 19**, Tailwind CSS, shadcn/ui, Lucide icons |
| Offline Database | **Dexie.js 4** (IndexedDB wrapper) |
| Video Playback | **HLS.js** (adaptive HLS), native `<video>` for mp4/mkv |
| Virtualisation | **react-virtuoso** (windowed lists and grids) |
| Data Fetching | **TanStack Query 5** |
| Encryption | **AES-GCM** via Web Crypto API, XOR fallback |
| PWA | Service Worker, Web App Manifest |

## Features

- Connect to any Xtream Codes-compatible IPTV provider
- Browse Live TV, Movies, and Series with virtualized grids
- Full-text search across all content stored in IndexedDB
- Favorites and watch-history tracking with progress bars
- Adaptive HLS streaming via HLS.js with retry and fallback
- Native `<video>` playback for mp4, mkv, webm containers
- External player integration (VLC via `vlc://`, Android intent)
- CORS Proxy toggle for mixed-content HTTP/HTTPS workarounds
- AES-GCM encrypted credential storage (with XOR fallback)
- Installable PWA with offline shell caching
- Responsive design: desktop sidebar + mobile bottom tab bar
- Dark theme by default

## Getting Started

### Prerequisites

- **Node.js** 18.18+ (LTS recommended)
- **pnpm** (preferred) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/eziptv.git
cd eziptv

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

## Usage

1. Open the app and enter your IPTV provider's **Server URL**, **Username**, and **Password**.
2. The app authenticates against the Xtream Codes API and syncs all categories and streams into your browser's IndexedDB.
3. Browse **Live TV**, **Movies**, or **Series** from the sidebar / bottom tabs.
4. Click any item to play. For HLS streams (`.m3u8`), HLS.js handles adaptive bitrate streaming. For direct files (`.mp4`, `.mkv`), the native `<video>` element is used.
5. If in-browser playback fails (common with MKV or mixed-content), use the **Open in New Tab**, **Open in VLC**, or **Copy Stream URL** buttons.

### Guest Demo

A "Guest Demo" button on the login screen loads a public NASA TV HLS stream so you can test the player without entering credentials.

## Troubleshooting

### Mixed Content (HTTP/HTTPS)

Most IPTV providers serve streams over plain HTTP. When EzIPTV is hosted on HTTPS (e.g. Vercel), browsers block these "mixed content" requests.

**Workarounds:**

| Approach | How |
| --- | --- |
| **Upgrade-Insecure-Requests** | Already enabled via a `<meta>` CSP tag -- the browser will automatically attempt HTTPS for every HTTP sub-resource. Works if the server supports SSL. |
| **CORS Proxy toggle** | Go to Dashboard > Settings and enable "Use CORS Proxy". This routes all stream URLs through `corsproxy.io`. |
| **Open in New Tab** | The player's error screen includes an "Open in New Tab" button that opens the raw stream URL directly -- bypasses the app's CSP entirely. |
| **External player** | Use the "Open in VLC" button (`vlc://` protocol) to hand off playback to VLC, PotPlayer, or any registered handler. |
| **Self-host on HTTP** | Run `pnpm build && pnpm start` locally on `http://localhost:3000` to avoid mixed-content issues altogether. |

### MKV Files Won't Play

MKV (Matroska) container support varies by browser. Chromium-based browsers (Chrome, Edge, Brave) have the best support. If playback fails, use the **Open in VLC** or **Download** buttons provided on the player gate screen.

### ERR_NAME_NOT_RESOLVED / Sandbox Errors

If running inside a sandboxed environment (e.g. v0, StackBlitz), external DNS resolution may be blocked. Deploy to Vercel or run locally for full functionality.

## Project Structure

```
app/
  (auth)/login/         Login page
  (app)/                Authenticated shell
    dashboard/          Home / settings / CORS toggle
    live/               Live TV categories and channels
    movies/             Movie categories, grid, detail pages
    series/             Series categories, grid, detail pages
    search/             Global search
    favorites/          Favorites list
    player/             Authenticated player
  player/demo/          Guest demo player (no auth required)

components/
  app-shell.tsx         Sidebar + bottom tab navigation
  video-player.tsx      Unified player (HLS.js + native + external)
  content-card.tsx      Poster card for grids
  channel-row.tsx       Row item for live channel lists
  content-grid.tsx      Virtualized grid wrapper

hooks/
  use-auth.ts           Authentication context + encrypted storage
  use-sync.ts           Bulk content sync to IndexedDB
  use-favorites.ts      Favorites CRUD via Dexie live queries
  use-playback.ts       Watch position persistence
  use-player.ts         HLS.js / native video lifecycle manager

lib/
  constants.ts          App-wide configuration values
  crypto.ts             AES-GCM encryption + XOR fallback
  db.ts                 Dexie.js database schema (8 tables)
  xtream-api.ts         Xtream Codes API client
  utils.ts              URL helpers, CORS proxy, stream candidates
```

## Future Nativization

EzIPTV is architected as a client-side SPA with zero server-side dependencies, making it an ideal candidate for wrapping in native shells:

### Capacitor (Android / iOS)

- Wrap the Next.js export in a Capacitor shell for Play Store / App Store distribution.
- Native WebView bypasses browser mixed-content restrictions entirely.
- Access to native video decoders means full MKV/AVI/HEVC support.
- Push notifications for new content or expiring subscriptions.

### Tauri (Desktop -- Windows / macOS / Linux)

- Lightweight Rust-based desktop wrapper (~5 MB vs Electron's ~150 MB).
- System-level network stack eliminates CORS and mixed-content issues.
- Can shell out to VLC or mpv for hardware-accelerated playback.
- Auto-update support via Tauri's built-in updater.

### Shared Code Strategy

The entire `lib/`, `hooks/`, and `components/` directories are framework-agnostic React code. The nativization plan is:

1. Export the Next.js app as a static SPA (`output: 'export'`).
2. Drop the static build into a Capacitor or Tauri project.
3. Replace the CORS proxy logic with direct HTTP (native shells don't enforce CORS).
4. Optionally integrate native media players for formats the browser can't handle.

## License

MIT
