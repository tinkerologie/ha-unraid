# Issue tracker: GitHub

Record issues and specifications in `tinkerologie/ha-unraid` on GitHub. Use connected GitHub tools if available. You can also use the `gh` commands below. Use `--body-file` for issue and pull request (PR) bodies with more than one line.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (database id, as in **Blocking** below). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Use `git remote -v` to identify the repository. If you run `gh` in a clone, it identifies the repository automatically.

## Pull requests as a triage surface

**PRs as a request surface: no.** The `/triage` skill reads this flag. Set it to `yes` if this repository treats external PRs as feature requests.

If the flag is `yes`, use the same labels and states for issues and PRs. Use these `gh pr` commands.

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub numbers issues and PRs in one sequence. To identify `#42`, run `gh pr view 42`. If it finds no PR, run `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**. Link the issue to the map as a GitHub sub-issue. See **Make an issue a sub-issue of a parent**. If sub-issues are unavailable, add the child to a task list in the map body. Put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). The person who takes the ticket becomes its assignee.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies are not available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. You can continue work on the ticket when all blockers are closed.
- **Frontier query**. List the map's open child issues with `gh issue list --state open`. Limit the list to the map's sub-issues or task list. Remove each issue that has an assignee or an open blocker. An open blocker has `issue_dependencies_summary.blocked_by > 0` or an open issue in the `Blocked by` line. Select the first remaining issue in map order.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
