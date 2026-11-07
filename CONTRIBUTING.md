# Contributing to Home Assistant Unraid Integration

Use [ASD-STE100 Issue 9](docs/agents/documentation.md) for new or changed English documentation.

Thank you for your interest in contributing to Home Assistant Unraid Integration. This project welcomes contributions from human developers and autonomous AI coding agents alike.

Home Assistant integration for monitoring Unraid arrays, pools, and hardware status.

All contributors must follow this workflow. It helps maintainers review changes and maintain code quality.

---

## Code of Conduct and Standards

- Be respectful, constructive, and collaborative.
- Zero secrets policy: Do not commit passwords, tokens, API keys, private certificates, or personal data.
- Anti-burnout principle: Perform full due diligence locally before opening pull requests or requesting review.

---

## Development Workflow

All contributors and AI agents must follow these steps.

### 1. Open a GitHub Issue First
- Each bug fix, feature, or enhancement must start with an issue.
- Use the appropriate GitHub Issue Form:
  - Bug Report (`01-bug-report.yml`)
  - Enhancement Request (`02-enhancement-request.yml`)
- Blank or unstructured issues are disabled. Pull requests without a corresponding issue will be closed.

### 2. CodeRabbit AI Plan Generation
- CodeRabbit can make a plan when GitHub adds the `bug` or `enhancement` label. To start it manually, add the comment `@coderabbitai plan` to the issue.
- CodeRabbit examines the code and posts a Coding Plan. The plan includes these items.
  - Codebase research and affected components
  - Architectural design choices
  - Phased task breakdowns
  - Machine-readable agent prompts and verifiable acceptance criteria
- Contributors must review, refine, and confirm the plan before writing code. Do not start implementation without an approved plan.

### 3. Create a Dedicated Branch
- Create a feature or bugfix branch off `main`:
  - Features: `git checkout -b feat/<issue-number>-<short-description>`
  - Fixes: `git checkout -b fix/<issue-number>-<short-description>`
  - Documentation: `git checkout -b docs/<issue-number>-<short-description>`
- Do not commit directly to the default branch (`main`).

### 4. Implementation and Local Validation
- Implement changes following project conventions and the approved plan.
- Update `CHANGELOG.md` under `## [Unreleased]` describing what changed and why.
- Run all required local validation checks (tests with coverage, linters, type checkers, and formatters). Correct all errors and warnings.

### 5. Follow the Pull Request Template
- Open a Pull Request using `.github/PULL_REQUEST_TEMPLATE.md`.
- Complete all sections in the template:
  - Summary of changes
  - Linked issue keywords (`Fixes #<issue>`, `Closes #<issue>`, `Addresses #<issue>`)
  - Verification steps and pasted terminal output
  - Mandatory Pre-Submission Governance checklist (each box must be checked)

### 6. Open PR as DRAFT First
- Pull requests MUST be opened in Draft mode (`gh pr create --draft` or choose "Create draft pull request" in GitHub).
- Draft PRs allow CI workflows to run in isolation without triggering premature reviewer notifications or consuming unnecessary review capacity.
- Wait for all CI checks to pass on the draft. Make sure the change works locally.

### 7. Mark Ready for Review
- Only after all local and draft CI checks have succeeded, convert the pull request to "Ready for Review".
- The project can return a PR to draft or close it. This can occur if checks fail or the PR has missing template fields or verification.

### 8. Automated Quality Gates and Merge Criteria
Before a pull request can be merged, it must satisfy all automated quality gates:
- CodeRabbit AI Review: All review comments and suggestions must be resolved or addressed.
- GitHub Copilot Code Review: Must pass with no blocking feedback.
- Codecov Coverage Reports: Must pass with zero errors, zero warnings, and no coverage regressions below the repository target.
- Branch Ruleset Checks: All required status checks defined in the default branch ruleset must pass.

---

## Local Development and Verification

### Prerequisites and Setup

- Python 3.12 or later
- Virtual environment with dependencies installed (`script/setup/bootstrap` or `uv pip install -e ".[test,dev]"`)
- Pre-commit (`pre-commit install`)

Tests use Home Assistant's official `pytest-home-assistant` plugin. The test
extra pins Home Assistant. The `[tool.uv.sources]` section pins the matching Core plugin commit.
Update both pins together. Then regenerate `uv.lock`. Use uv to honor that source.
Bootstrap removes the retired custom-component plugin from existing environments.
The runtime HA minimum is unchanged by the test baseline.
Bootstrap, upgrade, develop and automatic test setup stop before downgrading a
newer installed HA. Use a separate test virtual environment to preserve recorder data.

### Validation Commands

```bash
# Run tests with pytest and coverage
pytest
pytest --cov=custom_components --cov-report=term-missing

# Linting and formatting with ruff
ruff check .
ruff format --check .

# Static type checking
mypy custom_components

# Run all pre-commit hooks across all files
pre-commit run --all-files

# Import every module with deprecations recorded (also part of pytest)
python3 script/ha_next.py import-check

# Validate with Hassfest; HA_VERSION selects the Core tag or dev (needs uv for 2026.11+)
HA_VERSION=2026.11.0b1 ./script/hassfest
```

### Deprecation checks

`pytest` fails if the integration raises `DeprecationWarning` or `PendingDeprecationWarning`.
It also fails if Home Assistant logs a deprecation report about `unraid`.
The tests look for these report patterns.

- `Detected that custom integration 'unraid' …`
- `The deprecated … was used from unraid.`
- `custom_components.unraid.<module>::<Class> provides the deprecated …`

Correct the code. Keep the checks in effect.

Two scheduled workflows check for Home Assistant changes before a release.
To start a workflow manually, select **Run workflow** in the Actions tab.

- **HA Next** checks the latest Home Assistant on PyPI, including beta releases.
  It also checks Core `dev`. For each channel, it installs the test plugin
  from the applicable Core commit and runs all tests.
  It keeps one `ha-next` issue for each channel.
- **HA dev blog watch** checks developer blog posts. It opens a `ha-dev-blog`
  issue for each post that names code the integration uses. You can specify `days`.

---

## Commit Message Guidelines

We follow Conventional Commits:

- `feat(<scope>): <description>` — New feature
- `fix(<scope>): <description>` — Bug fix
- `docs(<scope>): <description>` — Documentation changes
- `test(<scope>): <description>` — Adding or updating tests
- `refactor(<scope>): <description>` — Code restructuring without functional change
- `chore(<scope>): <description>` — Tooling, dependencies, or repository maintenance

---

## Pull Request Governance Summary

- No spam or back-to-back PRs: Batch related changes into a single PR.
- AI-assisted PRs require human verification and local testing before submission.
- All template checkboxes must be confirmed.
- PRs must remain in Draft until verified.

## Issue and Pull Request Governance

These rules apply to each contributor, including AI coding agents. The full org-wide rules are in
[GOVERNANCE.md](https://github.com/tinkerologie/.github/blob/main/GOVERNANCE.md).

1. **Issue first.** Open an issue with the bug or enhancement template before you open a pull
   request. Use `[Bug]:` or `[Enhancement]:`, followed by a space and the title.
   The labeler adds `bug` or `enhancement` when it can identify the issue type.
   CodeRabbit then adds a Coding Plan to the issue. Follow that plan.
   The labeler skips issues with `question`, `duplicate`, `invalid`, `wontfix`, or `no-type`.
   It does not add a type label again if a maintainer removed it.
2. **Link the issue.** In **Related Issues**, use `Closes #<number>`, `Fixes #<number>`, or
   `Resolves #<number>` if the PR completes the issue. GitHub then closes the issue when
   the PR merges. For partial work, use `Part of #<number>` or `Related to #<number>`.
   Link to an existing issue. You can link to an issue in another public repository
   with `owner/repo#123`. Only contributors with write access or higher can use
   `None` for maintenance work such as CI, documentation, or dependency updates.
3. **One change at a time.** GitHub limits contributors without write access to two open,
   non-draft pull requests. Draft pull requests do not count. Do not edit files that another
   open PR changes. Examples include `CHANGELOG.md`, translations, `README.md`, and generated
   bundles. Wait for the first PR to merge. Then rebase your branch before you continue.
4. **Act on the Tinkerologie-Bot report.** If the PR governance check fails, the bot lists
   all problems in one numbered comment. Correct each problem in the PR description
   or push the necessary change. The check runs again and the bot updates the comment.
5. **Rebase before review.** Rebase on `main` before you mark the PR ready for review.
6. **Resolve conflicts first.** If the PR has the `conflicts` label, rebase on `main`.
   Resolve the conflicts. Keep all `CHANGELOG.md` entries under `[Unreleased]`.
   Run the tests again. Force-push the branch before you do other work.
7. **Coverage.** Tests must cover at least 90% of the added or changed lines for
   `codecov/patch`. Add tests for uncovered lines in the Codecov comment.
   In the PR description, explain each line that still has no coverage.
   Do not decrease coverage targets or add coverage ignore rules to pass the check.
8. **Stale items.** The bot adds `stale` to issues and PRs after 14 days without activity.
   It closes them 30 days later if there is no new activity. The bot skips these labels.
   - Issues: `pinned`, `security`, `confirmed`, `work-in-progress`, `priority: critical`, `priority: high`.
   - Pull requests: `pinned`, `security`, `work-in-progress`.

## Domain and architecture

Contributor terminology is defined in [GLOSSARY.md](GLOSSARY.md). Existing
architecture decisions and their source evidence are indexed in
[docs/adr/README.md](docs/adr/README.md).
