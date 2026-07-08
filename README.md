# eris-knowledge

Local read-only knowledge dashboard for ScarletEchoes production folders.

## Rules

- The app reads `D:\Github\ScarletEchoes\ScarletEchoes`.
- The app never writes to ScarletEchoes production files.
- App-local notes, tags, scan cache, and checked statuses live in SQLite under `data/`.

## Commands

```bash
npm install
npm test
npm run dev
npm run dev:watch
```

## Local Usage

1. Start the app:

```bash
npm run dev
```

2. Open `http://127.0.0.1:5174`.
3. Click `Scan` to read ScarletEchoes production folders.
4. Review Dashboard, Production cards, Needs Attention, and Assets.

The scanner is read-only. It does not create or edit files in ScarletEchoes.

## Watchdog

For long local sessions, run the watchdog instead of `npm run dev`:

```bash
npm run dev:watch
```

It checks the API health endpoint on `127.0.0.1:4174` and the Vite client on
`127.0.0.1:5174`. If either endpoint is stopped, it starts the matching npm
script again. Logs are written under `logs/`.
