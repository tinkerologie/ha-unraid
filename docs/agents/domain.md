# Domain Docs

Use these instructions when a skill reads project documentation.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root, or
- **`GLOSSARY-MAP.md`** at the repository root if it exists. It links to one `GLOSSARY.md` for each context. Read the glossaries for the applicable contexts.
- **`docs/adr/`**. Read the architecture decision records (ADRs) for the area you will change. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If a file does not exist, continue. Do not report missing files or suggest new files at this stage. The `/domain-modeling` skill creates them after you agree on a term or decision. The `/grill-with-docs` and `/improve-codebase-architecture` skills can call it.

This repository uses the single-context layout.

## File structure

Single-context repo (most repos):

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (presence of `GLOSSARY-MAP.md` at the root):

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## Use the glossary's vocabulary

Use the terms in `GLOSSARY.md` in issue titles, proposals, hypotheses, and test names.

If the glossary has no term for the concept, check if an existing term applies. If you need a new term, record it for `/domain-modeling`.

## Flag ADR conflicts

If your proposal conflicts with an ADR, identify the ADR and give the reason for the change.

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
