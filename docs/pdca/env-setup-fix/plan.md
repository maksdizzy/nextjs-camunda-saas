# Plan: Environment Setup Fix

## Hypothesis
**Problem**: Users following the README encounter validation errors for missing required environment variables (Stripe keys, BILLING_PLAN_ENV, Clerk sign-in URL).

**Root Cause**: Mismatch between `.env.example` (marking Stripe as optional) and `src/libs/Env.ts` (requiring Stripe with `.min(1)` validation).

**Why This Happened**: The SaaS boilerplate has payment functionality built-in, so the validation schema requires Stripe variables, but the example file didn't clearly communicate this requirement.

## Expected Outcomes
- Users can successfully run `npm run dev` after following README instructions
- All required environment variables clearly documented
- Zero validation errors for users following setup steps
- Clear distinction between required vs optional configuration

## Implementation Strategy
1. Update `.env.example` to include all required variables with clear labels
2. Update README Configuration section with step-by-step setup for each service
3. Add inline comments explaining each variable's purpose
4. Document BILLING_PLAN_ENV values and when to use each

## Risks & Mitigation
- **Risk**: Users might skip Stripe setup if they don't need payments
  - **Mitigation**: Add note about disabling Stripe validation in future enhancement
- **Risk**: Confusion about test vs production keys
  - **Mitigation**: Clear labeling of test mode keys in examples
