# Strict Coding Rules

1. **App Router Only**: All routes go in `/app/`.
2. **UI Components**: `app/portal/page.tsx` is a Client Component (`'use client'`). It must have:
   - A message: "Follow our Facebook page to get internet access."
   - Button A: "Open Facebook Page" (opens `https://facebook.com/YOUR_PAGE` in new tab).
   - Button B: "I have followed! Check my access".
3. **Verification Logic**: When Button B is clicked:
   - Call `POST /api/portal/verify` with `{ token }`.
   - If success, start polling `GET /api/session/[token]` until `AUTHORIZED` or `FAILED`.
4. **Mock Environment**: 
   - If `MOCK_FOLLOWERS=true`, the Graph API route returns `count: initialCount + 2`.
   - If `MOCK_OMADA=true`, the relay returns `{ success: true }` without calling Omada.
5. **Security**: Never expose env vars to the browser. Use `NEXT_PUBLIC_*` ONLY for the Facebook Page URL.