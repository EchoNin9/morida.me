# Claude Instructions for morida.me

## Git Workflow

**Always commit and push to the `develop` branch only.**

- Before any commit, confirm the current branch is `develop`. If it is not, switch to `develop` (creating it from the current branch if it does not exist) before staging or committing.
- `git push` targets `origin develop` exclusively. Never push to `main` or any other branch.
- `main` is updated only via pull request from `develop` — never via direct push.

## Frontend deploy

- The SPA build (`npm run build` in `src/web/spa`) is Vite. Vite copies everything in `src/web/spa/public/` to `dist/` automatically, so `public/auth.js` and `public/config.js` ship without any extra copy step. The deploy job overwrites `dist/config.js` at runtime with Terraform outputs; `auth.js` ships as-is from `public/`.
- `public/auth.js` is the canonical Cognito bootstrap script. (A duplicate `src/web/auth.js` once existed with a redundant `cp` in the deploy workflow — both removed.)

## Before deleting a file

Grep the filename across `.github/workflows/`, `scripts/`, and `infra/` — not just source imports. A file can be "dead" to the app yet still referenced by a CI/deploy step, and `set -e` makes a missing `cp`/`mv` source fail the whole deploy. Verify a green deploy run after any file deletion.
