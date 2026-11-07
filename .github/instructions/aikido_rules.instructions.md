---
applyTo: "**"
description: Aikido MCP Security Rules
---

# Project security best practices

- Run **aikido_full_scan** on all first-party code you add or change. Skip the scan only if the user tells you to.
- Send the full file contents to the scanner.
- Correct security problems in the new or changed code. Use the **Aikido** report and its instructions.
- Run aikido_full_scan again after each correction. Check for remaining and new problems.
- Repeat these steps until the scan finds no security problems.
- If you cannot start the **Aikido MCP server**, tell the user. Give them the official setup guide.
  **https://help.aikido.dev/ide-plugins/aikido-mcp**.
