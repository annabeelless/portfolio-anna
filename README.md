# Anna — portfolio site

Astro static site + Decap CMS admin (`/admin`).

- Content: `src/content/projects/*.json` (one file per case), `src/data/site.json` (name, hero, contacts).
- Images: `public/img/...` (new uploads from admin go to `public/img/uploads`).
- Local: `npm install`, `npm run dev`. Build: `npm run build` → `dist/`.
- Hosting: Timeweb Cloud App Platform (build `npm run build`, output `/dist`), repo connected by URL - deploy manually in Timeweb after each push.
- Admin: `/admin` (Sveltia CMS). Log in with "Sign In Using Access Token" - a GitHub fine-grained token for this repo with Contents: read and write.
- [ ] Вернуться к кастомному курсору на финальной стадии (после мобильной версии)
