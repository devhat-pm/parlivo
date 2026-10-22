# 0003. Whop is the billing provider

- Status: Accepted
- Date: 2026-10-22
- Source: architect decision A6 (prompt 2); ARCHITECTURE.md sections 3 and 10

## Context

Parlivo sells per-workspace plans (free tier: 40-minute meetings, 3 participants, 2 languages; paid tiers above it). The architecture first named Stripe. The founder has chosen Whop instead: it provides hosted checkout, so Parlivo never handles card data or builds payment pages, and it models purchases as memberships, which map onto workspace plans. The core API already owns workspaces, usage metering and plan limits (section 10).

## Decision

- Whop is the billing provider. Customers buy through Whop's hosted checkout; a Whop membership is linked to one Parlivo workspace.
- The core API (`apps/api`) is the only authority on a workspace's plan. It updates the plan only from Whop webhooks whose signatures it has verified, or from server-to-server Whop API calls. It never trusts plan or entitlement claims from the client (web, desktop or a redirect query string).
- Plan limits (meeting length, participants, languages) are enforced in the API, when a meeting is created and a participant joins, and by LiveKit token grants. They are never enforced only in the UI.

## Consequences

- Positive: no card handling, PCI scope stays with Whop, and checkout UI comes for free.
- Negative: Whop charges a platform fee on each transaction in addition to payment processing. Check the current rate against Whop's pricing page before setting prices; it raises the effective cost per paying workspace.
- Negative: plans must fit Whop's membership model (one membership per workspace, renewals and cancellations as membership state changes). Per-seat enterprise billing with invoices may not fit, so a second provider for enterprise seats may be needed later; that would be a new ADR.
- Negative: webhooks can arrive late, more than once or out of order. Handlers must be idempotent (store each processed event ID, apply membership state transitions by timestamp) and reconcile periodically against the Whop API.
- Follow-up: the billing prompt adds the webhook endpoint, signature verification, the idempotency table and the membership-to-workspace link to the Prisma schema.
