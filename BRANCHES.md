# Branch policy

**Two branches, on purpose. Do not merge.**

| Branch | Use |
|--------|-----|
| `rag` | One purpose (you decide which) |
| `phase2/product-database` | Other purpose (you decide which) |

- **Never** merge one into the other.
- **Always** push only to the branch you're on: `git push origin <current-branch>`.
- Before pushing: `git branch` to confirm which branch you're on.

**Optional (reminder on every push):**  
`git config core.hooksPath .githooks` — then every push prints the branch and the no-merge reminder.
