# File Editing & Overwrite Prevention Rule

## 🛑 MANDATORY SAFE EDITING DIRECTIVE
1. **No Accidental Overwrites**: Never call `write_to_file` with `Overwrite: true` on an existing production component or widget file unless performing an intentional full rewrite. Use `replace_file_content` or `multi_replace_file_content` for targeted modifications.
2. **Pre-Flight File Verification**: Before declaring an edit complete, verify that target files are intact, non-empty, and export all expected symbols.
3. **Vitest Verification**: Run `npm run test` after component edits to guarantee zero `Module not found` or import resolution errors.
