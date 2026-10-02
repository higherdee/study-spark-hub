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

# Architecture decisions

- Store the institution and course directories as static JSON imported by the UI, because selection stays instant with no backend lookup.
- Award points and move balances only inside security-definer database functions (set_material_status, request_withdrawal, admin_*), because clients must never write points directly.
- Run file verification in a server function using the admin client after reading the uploader's own row, because the AI check needs the private file and must set status atomically.
- Keep student pages under /_authenticated/dashboard and admin pages under /_authenticated/admin, gating admin UI with user_roles and enforcing access with RLS.
- Ship home-screen install as manifest-only (no service worker), because offline mode was not requested.
