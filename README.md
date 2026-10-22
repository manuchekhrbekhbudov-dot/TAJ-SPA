# TAJ SPA Website

Responsive Tajik-language website for TAJ SPA, built with HTML, CSS and vanilla JavaScript.

## Website features

- Premium dark, gold and pool-blue visual style.
- High-resolution internet reference photos for pools, sauna, gym, reception and jacuzzi. They are reference/stock photos, not representations of the actual TAJ SPA premises.
- Services and membership information, including the known monthly 12-visit membership at 1,050 somoni.
- Customer review form and complaint/suggestion/question form.
- Private admin inbox at [admin.html](https://manuchekhrbekhbudov-dot.github.io/TAJ-SPA/admin.html). Feedback is protected by Supabase Row Level Security.

## Important: one-time backend setup required

The website is hosted on GitHub Pages, which is static hosting. To actually save feedback to a shared private inbox, a Supabase project must be connected. The website code has been wired up, but feedback will not save until the placeholders in `supabase-config.js` are replaced with your Supabase project details.

### 1. Connect Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and create a separate project for TAJ SPA (do not reuse the cargo accounting database).
2. Open **Project Settings → API** and copy the **Project URL** and the **publishable/anon key**.
3. Edit `supabase-config.js` in this repository and replace:
   - `https://YOUR-PROJECT.supabase.co` with the Project URL.
   - `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY` with the publishable/anon key.
4. Never put a `service_role` or secret key in this file. This is a public browser file.

### 2. Create the database and security rules

1. In Supabase, open **SQL Editor → New query**.
2. Copy the full contents of [supabase-setup.sql](supabase-setup.sql), run it, and confirm it completed successfully.
3. This creates `spa_feedback` and `spa_admins`, enables Row Level Security, allows visitors to submit feedback, and restricts reading/updating/deleting feedback to admin-listed authenticated users.

### 3. Create the admin login

1. In Supabase, open **Authentication → Users** and invite the administrator email or create that user.
2. Complete the invitation/password setup so the account can sign in with email and password.
3. Copy the administrator's **User UID** from Authentication → Users.
4. In **SQL Editor**, run this query after replacing the UUID:
   ```sql
   insert into public.spa_admins (user_id, display_name)
   values ('PASTE-ADMIN-USER-UUID-HERE', 'TAJ SPA Admin')
   on conflict (user_id) do update
   set display_name = excluded.display_name;
   ```
5. Open **Authentication → URL Configuration** and add the live admin page URL to allowed redirect URLs if your project settings require it:
   `https://manuchekhrbekhbudov-dot.github.io/TAJ-SPA/admin.html`
6. Visit [the admin page](https://manuchekhrbekhbudov-dot.github.io/TAJ-SPA/admin.html) and sign in with that account.

Only users listed in `spa_admins` can read the feedback inbox. Do not create a public insert policy for `spa_admins`, and do not put a Supabase secret/service-role key in browser JavaScript.

## Project files

- `index.html` — public website and forms
- `style.css` — responsive design and high-resolution internet photos
- `main.js` — validation and feedback saving
- `admin.html`, `admin.css`, `admin.js` — private admin interface
- `supabase-config.js` — public project URL and anon/publishable key placeholders
- `supabase-setup.sql` — database schema and access policies
- `assets/` — brand logo and unused legacy local images

## Publishing

Repository: [TAJ-SPA](https://github.com/manuchekhrbekhbudov-dot/TAJ-SPA)

Live website: https://manuchekhrbekhbudov-dot.github.io/TAJ-SPA/

If the design does not change immediately, hard-refresh the browser with **Ctrl+F5** after GitHub Pages deployment completes.
