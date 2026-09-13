# Essay workspace

The owner edits prose at https://machinesoflovingtaste.com/edit. Access uses a random private key exchanged for a signed, HttpOnly, Secure, SameSite cookie lasting 30 days. The key is never embedded in the public site. A private access link is kept locally in `.vercel/editor-access.html`; `ESSAY_EDITOR_KEY` is in Vercel production and the ignored `.env.local`. Rotate that variable to revoke access and existing sessions.

## Read the user's changes

Run `npm run drafts` before responding to a request to review `/edit` changes. This reads the latest shared drafts from the private Vercel Blob store and writes ignored files under `.vercel/essay-drafts/`:

- `*-changes.md`: original and edited prose for each changed section.
- `*-draft.md`: complete editable prose, with link destinations.
- `*.json`: exact draft, baseline, figures and revision metadata.

If local credentials are missing, `vercel env pull .env.local --environment development` restores the connected Blob credential. Do not print tokens or commit these files. On a different machine, the project's Vercel access is needed to retrieve private drafts. The assistant does not receive live notifications: run the command when the user asks to review changes.

## Publishing and builds

Saving a draft does **not** publish it. Review its changes, incorporate approved wording in `src/site.js`, keep citations and generated data accurate, then use the usual build/test/GitHub workflow. Drafts retain their starting edition, so a site rebuild cannot erase them. If the published edition changed, the editor explains that the draft is based on an earlier version; review and reconcile it explicitly.

`node src/site.js` also builds `public/edit.html`, `public/editor/site.css`, and `lib/essay-baselines.json`. The original essay HTML is split into editable prose regions; figures, quoted model responses and detailed methods remain in place. Editor layout and behavior live in `public/editor/editor.css` and `public/editor/editor.js`; the shell is `src/editor.html`. Rich text is sanitized on the server. API routes are `api/editor-session.js` and `api/essay-drafts.js`.

Storage is private Vercel Blob (`molt-essay-drafts`), accessible only server-side through `BLOB_READ_WRITE_TOKEN`. Consistent reads bypass Blob caching. An ETag conditional write prevents concurrent edits from overwriting one another, including first-save races. Before replacing a draft, its previous version is archived. The editor exposes the latest 30 historical saves; all earlier snapshots remain stored. API responses are never cached. Failures preserve the browser recovery copy and never report success. The existing Supabase suggestion connection is unrelated to this editor.

## Local checks

`npm run editor:dev` starts http://127.0.0.1:8766/edit using the production handlers and private Blob storage under the separate `development/` prefix. The local `.env.local` needs the editor key and Blob token. `npm test` covers API authentication, sanitization, conditional writes, preservation of old versions, and the original site's data checks.
