# ⚡ SpriteTracker

A dark-themed, installable **Progressive Web App** for tracking Fortnite sprites and items with
your friends. No backend, no database, no build step — plain HTML, CSS and vanilla JavaScript that
drops straight onto GitHub Pages.

Each player picks a username, and their list is stored in that browser under
`localStorage["spriteData_<Username>"]`, so several people can share one device without
overwriting each other.

---

## Features

| | |
|---|---|
| **Mini login** | Username-gated entry, remembered profiles on the device, one-tap re-login, Log Out button |
| **Local database** | `localStorage` keyed per username — nothing ever leaves the browser |
| **Three-state tracking** | `Don't Have` (default) · `Acquired` · `Mastered` |
| **Add / delete** | Add any sprite with a rarity, delete with a confirm step, duplicate-name guard |
| **Live stats** | Counts per status plus a collection progress bar |
| **Search & filter** | Free-text search and one-tap status filters |
| **Trade list** | Generates plain text from `Acquired` + `Mastered` only, in Grouped / Flat / CSV formats, with Copy to Clipboard and Download |
| **Backup** | Export/import your list as JSON |
| **PWA** | `manifest.json` + service worker — installable, works fully offline |

---

## File structure

```
fortnite-sprite/
├── index.html          ← markup for the login screen, tracker and modals
├── styles.css          ← dark "gamer" theme, responsive down to 320px
├── app.js              ← all logic (login, storage, rendering, trade list, PWA)
├── manifest.json       ← PWA metadata (name, icons, colours, start_url)
├── sw.js               ← service worker: precache + offline support
├── .nojekyll           ← stops GitHub Pages' Jekyll from touching the files
├── README.md
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    ├── maskable-512.png
    ├── apple-touch-icon.png
    └── favicon-32.png
```

Every path in the project is **relative** (`./app.js`, `./sw.js`, `"start_url": "./"`), which is what
lets the app work from a repository subfolder like `username.github.io/fortnite-sprite/` instead of
only from a domain root.

---

## Deploying to GitHub Pages

### If you already have this repo

1. Push your branch and merge it into `main`.
2. On GitHub go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Pick branch **`main`** and folder **`/ (root)`**, then hit **Save**.
5. Wait ~1 minute and open:
   **`https://<your-username>.github.io/fortnite-sprite/`**

### Starting from scratch

```bash
git init
git add .
git commit -m "SpriteTracker PWA"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then follow steps 2–5 above.

> **Important:** the files must sit at the repository root (or in a `/docs` folder if you select that
> option in Settings → Pages). `index.html` has to be at the top level of whatever folder you publish.

### Testing locally first

A service worker will not run from a `file://` URL, so use a tiny local server:

```bash
python3 -m http.server 8000     # then open http://localhost:8000
# or
npx serve .
```

### Installing it on a phone

Open the Pages URL in Chrome (Android) or Safari (iOS):

* **Android/Chrome** — tap the "Install app" button in the corner, or menu → *Add to Home screen*.
* **iOS/Safari** — Share button → *Add to Home Screen*.

---

## Updating the app after you deploy

The service worker caches the app, so **bump the cache name whenever you change a file**, otherwise
returning visitors may keep the old version:

```js
// sw.js
var CACHE_VERSION = 'sprite-tracker-v2';   // v1 → v2
```

Page loads use network-first, so a new `index.html` is picked up as soon as it deploys; the version
bump is what clears the old CSS/JS.

---

## Notes & limits

* **Data is per-browser.** Clearing site data, or opening the app on a different phone, means an
  empty list. Use **Export backup (.json)** to move a list between devices.
* **Not a shared/live database.** Everyone tracks their own list locally; the Trade List is how you
  share with each other. If you later want real syncing between friends, the natural next step is a
  free tier of Firebase/Supabase — that would replace `save()` / `loadItems()` in `app.js` and
  nothing else.
* Usernames allow letters, numbers, spaces, `.`, `_` and `-`, 2–24 characters, and are matched
  case-insensitively so `nina` and `Nina` return to the same list.
* Sprite names are rendered with `textContent`, never `innerHTML`, so a name containing HTML is
  displayed as plain text rather than executed.

## Customising

* **Starter list** — edit `STARTER_PACK` near the top of `app.js`.
* **Rarities and colours** — edit `RARITY_COLORS` in `app.js` and the `<select id="add-rarity">`
  options in `index.html`.
* **Theme** — every colour is a CSS variable in the `:root` block at the top of `styles.css`.
* **Trade list wording** — see `buildTradeList()` in `app.js`.
