# ⚡ SpriteTracker

A dark-themed, installable **Progressive Web App** for tracking Fortnite sprites with your friends.
No backend, no database, no build step — plain HTML, CSS and vanilla JavaScript that drops straight
onto GitHub Pages.

It ships with the **21 official base sprites**, each tracked across all **7 variations**
(Base, Gold, Gummy, Galaxy, Holofoil, Cube, Gem) — **147 individually trackable statuses**.

Each player picks a username, and their list is stored in that browser under
`localStorage["spriteData_<Username>"]`, so several people can share one device without
overwriting each other.

---

## Features

| | |
|---|---|
| **Mini login** | Username-gated entry, remembered profiles on the device, one-tap re-login, Log Out button |
| **Local database** | `localStorage` keyed per username — nothing ever leaves the browser |
| **Per-variation tracking** | Every sprite carries its own status for each of the 7 variations |
| **Three states** | `Don't Have` (default) · `Acquired` · `Mastered` — tap a variation to cycle forward, right-click or shift-tap to go back |
| **Sprite abilities** | Each card shows what the sprite actually does |
| **Add / delete** | Add custom sprites (they get all 7 variations too), delete with a confirm step, restore any official sprites you removed |
| **Live stats** | Counts per status, a per-card `owned/7` badge and a collection progress bar |
| **Search & filter** | Search names *and* abilities, filter by status, or focus a single variation (e.g. "Galaxy only") |
| **Trade list** | Generates plain text from `Acquired` + `Mastered` only, as By status / By sprite / CSV, with Copy to Clipboard and Download |
| **Backup** | Export/import your list as JSON |
| **PWA** | `manifest.json` + service worker — installable, works fully offline |

---

## File structure

```
fortnite-sprite/
├── index.html          ← markup for the login screen, tracker and modals
├── styles.css          ← dark "gamer" theme, responsive down to 320px
├── sprites.js          ← the sprite catalog: variations + base sprites/abilities
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
* A new player is seeded with the full official list automatically; lists saved by the earlier
  single-status version are upgraded on next login (the old status lands on `Base`).
* Sprite names are rendered with `textContent`, never `innerHTML`, so a name containing HTML is
  displayed as plain text rather than executed.

## Customising

Everything about *what* is tracked lives in **`sprites.js`** — you shouldn't need to touch `app.js`
to change the list:

```js
window.SPRITE_CATALOG = {
  variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil', 'Cube', 'Gem'],
  baseSprites: [
    { id: 'air', name: 'Air Sprite', ability: 'Increases sprinting speed and jump height.' },
    …
  ]
};
```

* **New sprite** — add an entry with a unique `id`. Players pick it up via *Restore missing sprites*.
* **New variation** — add it to `variations`; existing sprites gain it as `Don't Have`.
* **Renaming / fixing an ability** — edit it in place. As long as the `id` stays the same, every
  player's saved statuses are kept and the new text appears on their next visit.
* **Theme** — every colour is a CSS variable in the `:root` block at the top of `styles.css`.
* **Trade list wording** — see `buildTradeList()` in `app.js`.

After any change, bump `CACHE_VERSION` in `sw.js` so installed copies refresh.
