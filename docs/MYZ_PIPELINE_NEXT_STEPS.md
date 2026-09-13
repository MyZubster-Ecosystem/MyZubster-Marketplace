# MYZ pipeline next steps

Once the Marketplace and core MYZ workflows are green on their merged commits, the next engineering step is provider-specific staging integration.

That later change must remain separate from this test-only pipeline and should require an explicitly reviewed sandbox/test provider, real idempotency semantics, evidence lookup, retry classification, no production credentials in CI, and a legal/compliance review before any live external MYZ settlement is enabled.
