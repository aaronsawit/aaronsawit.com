# aaronsawit.com

Static portfolio and write-ups. No framework: Markdown in, HTML out.

- `content/site.json`   name, about, training, toolbox, "where I fit", smaller builds, contact
- `content/work/*.md`   case studies (front matter: order, title, kind, summary, role, when, stack, visual or image)
- `content/posts/*.md`  write-ups (front matter: title, date, tag, summary)
- `content/visuals/`    inline SVG diagrams, referenced as `[[visual:name]]`
- `wp-export/`          the old WordPress posts and their images; `build.mjs` keeps six and redirects every old URL

```bash
npm install
npm run build                                   # -> dist/
npx wrangler pages deploy dist --project-name aaronsawit --branch main
```
