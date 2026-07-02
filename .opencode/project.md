# Project: Facebook Follower-Gated WiFi Portal (Simplified)

## Core Objective
A captive portal proof-of-concept. Guests connect to WiFi, see a page asking them to follow a Facebook Page. The system checks if the Page's total follower count has increased since the user arrived. If yes, it grants internet access via Omada.

## Critical Constraints
1. **No Database**: Use `globalThis` in-memory Map.
2. **No Webhooks**: We don't use comment listening. Pure "pull" mechanism (user clicks a button to check).
3. **Mock Mode**: `MOCK_FOLLOWERS` and `MOCK_OMADA` env vars allow full testing without real credentials.
4. **Status Flow**: `PENDING` -> `VERIFYING` -> `AUTHORIZED` (or `FAILED`).

## Key Files
- `lib/sessionStore.ts`: In-memory Map.
- `app/api/graph/fan-count/route.ts`: Calls Meta Graph API (or mocks it).
- `app/api/portal/verify/route.ts`: Compares follower counts and triggers Omada.
- `app/portal/page.tsx`: Shows "Follow Us" UI with two buttons.
- `local-relay/index.js`: Stateless Omada proxy (with mock toggle).