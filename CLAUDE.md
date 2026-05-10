# Claude Instructions for morida.me

## Git Workflow

**Always commit and push to the `develop` branch only.**

- Before any commit, confirm the current branch is `develop`. If it is not, switch to `develop` (creating it from the current branch if it does not exist) before staging or committing.
- `git push` targets `origin develop` exclusively. Never push to `main` or any other branch.
- `main` is updated only via pull request from `develop` — never via direct push.
