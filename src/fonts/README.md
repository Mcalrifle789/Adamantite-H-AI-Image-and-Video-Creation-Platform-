# Fonts

The four faces named in the project spec, converted from the installed desktop
files to subsetted `.woff2` and loaded via `next/font/local` in
`src/app/layout.tsx`. Sources live here rather than in `public/` so Next emits a
single hashed, immutably-cached copy instead of two.

| File | Family | Role | Licence status |
| --- | --- | --- | --- |
| `kaluar-*.woff2` | Kaluar **Demo** | Logotype, headings | ⚠️ **Demo cut. Not licensed for commercial use or redistribution.** |
| `relevance-*.woff2` | Relevance **trial** | Tracked uppercase micro-type | ⚠️ **Trial cut. Not licensed for commercial use or redistribution.** |
| `raleway-*.woff2` | Raleway | Body, UI, chat box | SIL Open Font License 1.1 — free to use and redistribute. |
| `../../public/fonts/arial-ce-400.woff2` | Arial CE | Last-resort fallback in every stack | ⚠️ Monotype. Bundled with Windows; redistribution is not covered by that bundling. |

## Before this ships commercially

Adamantite H charges money, so the demo and trial cuts above must be replaced
with purchased licences — or swapped for faces that permit commercial use — and
the Arial CE fallback re-examined. Raleway is the only entry here that is
unambiguously clear today.

To remove the encumbered files from the working tree and from git history:

```bash
git rm --cached src/fonts/kaluar-*.woff2 src/fonts/relevance-*.woff2 \
                public/fonts/arial-ce-400.woff2
# then rewrite history, e.g. with git-filter-repo
```

## Regenerating

The `.woff2` files are built from the desktop originals with `fontTools`.
Raleway is subsetted to Latin-1, Latin Extended-A, general punctuation, arrows
and currency; the others ship whole because they are small already.

Relevance's trial cut has no `$ % & + < = > @ ^ | ~` or backtick. That is why it
is confined to the `font-label` role and never used on prices, email addresses
or free text — those glyphs would otherwise drop to the fallback mid-word.
