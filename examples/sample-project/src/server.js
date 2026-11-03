// A tiny stand-in for a real app, just so the env vars below have a reason
// to exist. Reads config the same way a real Express/Node service would.
const required = [
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "SESSION_SECRET",
  "PORT",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
  }
}

console.log(`Would start acme-api on port ${process.env.PORT ?? "(unset)"}`);
