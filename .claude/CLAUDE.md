# Priva.TOOLS - Project Instructions

## Design System

Style : **Neobrutalism**

- Fond : off-white `#FAFAFF`, cards blanches `#FFFFFF`
- Bordures epaisses noires `border-slate-900` (2px ou 3px)
- Ombres decalees solides : `shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]`
- Coins arrondis genereux : `rounded-2xl`, `rounded-xl`, `rounded-full`
- Typo : `font-black`, `tracking-tight`, uppercase pour les labels

### Palette pastel (couleurs de surface)

- PDF : `rose-50` / `rose-500`
- Image : `cyan-50` / `cyan-500`
- Privacy/trust : `emerald-50` / `emerald-500`
- Performance : `amber-50` / `amber-500`
- Primary/brand : `indigo-50` / `indigo-500` (`#6366F1`)

### Composants cles

- Cards : fond pastel + `border-[3px] border-slate-900` + shadow brutalist
- Boutons : `border-2 border-slate-900` + shadow brutalist + `hover:-translate-y-1`
- Header : `bg-white/80 backdrop-blur-md border-b-[3px] border-slate-900`
- Blobs decoratifs : SVG flous (`blur-3xl opacity-40`) en arriere-plan, indigo + pink
- Icones : Lucide React, `strokeWidth={2.5}`

## Code Style

- Functional only: `type` aliases (no `interface`), factory functions (no `class`)
- No DI containers, no abstract classes

## Pre-push Review

A Claude Code hook blocks `git push` until a code review is done.

### Workflow
1. Hook denies push and prints the branch name + diff stat.
2. Launch the `code-standards-guardian` agent to review `git diff origin/master...HEAD`.
3. The guardian reviews ALL changed files against project standards.
4. **NON-NEGOTIABLE**: if the guardian finds ANY issue (critical, standard violation, or recommendation), it MUST list them clearly and hand them back to the caller for fixing. It MUST NOT create the marker file.
5. The caller fixes all issues, then re-runs the guardian.
6. Only when the guardian finds ZERO remaining issues may it run: `touch /tmp/.claude-review-passed-{branch}`
7. Retry `git push`.

### Rules for code-standards-guardian
- NEVER create the marker file if issues were found. No exceptions.
- The only valid reason to skip an issue is if fixing it would break the build (truly blocking). In that case, document the skip with a justification.
- Recommendations count as issues. They must be fixed or explicitly acknowledged by the user before the marker is created.
