# Mirror Mode Release Checklist

1. Run `pnpm run test:pricing:gate` and ensure all suites pass.
2. Run `pnpm build` and ensure build succeeds.
3. Verify at least one LOI fixture with `Resp Matrix-*` renders matrix section.
4. Verify malformed fixture is rejected with `422 PARSER_VALIDATION_FAILED`.
5. Verify LOI PDF preflight blocks when matrix candidates exist but parsed matrix is missing.
6. Regenerate client share links after parser/template changes (new immutable version/hash).
7. Confirm `pricingDocument.metadata.validation.status === "PASS"` for exported projects.
8. Confirm `parserStrictVersion` on Proposal equals current parser strict version.
