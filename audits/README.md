# Security Audits

## Halborn Security — March 2024

**Scope:** `packages/contracts/src/FaucetController.sol`, `FaucetRegistry.sol`, `MockToken.sol`

**Findings:**

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| HAL-001 | Medium | Missing zero-address check in `drip()` | ✅ Fixed |
| HAL-002 | Low | Cooldown can be bypassed via override at 0 | ✅ Fixed |
| HAL-003 | Informational | Use custom errors instead of `require` strings | ✅ Fixed |
| HAL-004 | Informational | Add NatSpec to all public functions | ✅ Fixed |

**Overall Risk:** Low (post-remediation)

Full report PDF: `halborn-ethora-faucet-2024-03.pdf` *(available on request)*

---

*Audits do not guarantee the absence of bugs. Use testnet contracts at your own risk.*
