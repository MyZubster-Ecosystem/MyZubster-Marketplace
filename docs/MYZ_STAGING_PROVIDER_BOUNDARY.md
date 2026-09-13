# MYZ staging provider boundary

The staging end-to-end workflow intentionally does not configure any external settlement provider credentials.

The tested path is:

```text
canonical MYZ balance
-> Marketplace reservation
-> mocked external settlement contract
-> provider reconciliation contract
-> canonical MYZ debit
-> worker/recovery evidence
```

This is enough to validate integration behavior without representing a live exchange or redemption service. Any future provider-specific staging rail must be introduced in a separate reviewed change with explicit sandbox/test credentials, idempotency guarantees, settlement evidence contract, retry semantics and compliance review.
