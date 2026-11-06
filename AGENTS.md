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

- Keep simulation audio browser-only and initialize it after an explicit sound-toggle gesture, so SSR remains safe and autoplay restrictions are respected.
- Scale the event-card wrapper separately from its falling animation, so mobile sizing does not get overridden by animated transforms.
- Keep investment statistics separate from legacy simulation trading state; educational categories use a browser-safe static catalog without API calls, while public server functions fetch allowlisted market symbols for other categories and report unavailability honestly.
- Render brand metadata through TanStack route heads and the web manifest; there is no index.html in the SSR project.
- Migrate legacy browser storage on first read, preserve newer values and malformed originals, and synchronize profile expense/allocation slices on save to avoid data loss.
- AI allocation advice runs only in a server function (`src/lib/goal-advisor.functions.ts`) via the AI Gateway SDK with a strict JSON schema, and the split is re-normalized to 100% before reaching the UI — keeps prompts server-side and the result always valid.
