<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- All data goes through `src/lib/api.ts`, which mirrors the planned FastAPI REST endpoints, so a real backend can replace the mock with no UI changes.
- Shared demo state lives in a zustand store persisted to localStorage and rehydrated on `storage` events, so dispatcher and hospital tabs stay in sync live.
- The sign-in session is kept in sessionStorage (one per tab), so two tabs can be signed in as different roles.
- Ranking is deterministic in `src/lib/matching.ts` (weights in one config object); the explanation text only rewords reason codes and never affects ranking.
- App routes use `ssr: false` plus `beforeLoad` role gates, because the state and auth are browser-only.
- Map tiles are OSM with a CSS muted filter, because CARTO tiles now need an API key.
