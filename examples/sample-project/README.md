# envguard sample project

A minimal app (`src/server.js`) used to demo `envguard` with a real, installed
package — not by running the repo's own `dist/cli.js` directly.

## How it was set up

```bash
# from the envguard repo root
npm run build && npm pack

# in this folder
npm install --save-dev ../../envguard-0.1.0.tgz
```

This installs `envguard` into `node_modules` exactly the way a real
`npm install envguard` would, with the CLI exposed as
`node_modules/.bin/envguard` — the same path `npx envguard` resolves.

## Try it yourself

```bash
npx envguard                 # check .env against .env.example
npx envguard --strict        # fail on warnings too
npx envguard --format json   # machine-readable output
npx envguard init            # regenerate .env.example from .env
```

Edit `.env` to remove a key, leave one blank, set `STRIPE_SECRET_KEY=changeme`,
or duplicate a line, then re-run `npx envguard` to see each check fire.
