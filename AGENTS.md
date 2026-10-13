# Shopify app development

This app is scaffolded from a Shopify app template. See the README for framework-specific details.

Use the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) for all Shopify API and platform work. If missing, install it in the agent host per that page (or `npx skills add Shopify/shopify-ai-toolkit --list` for skill-compatible hosts) — do not add tooling to this repo.

## Git Operations Rule
- **NEVER execute any `git` command** (including `git commit`, `git push`, `git add`, `git checkout`, `git merge`, etc.) unless the user explicitly asks to run git or push in their prompt.
