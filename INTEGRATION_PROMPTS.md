# MPS Auth — Integration Prompts for Connected Apps

Use these prompts when building or updating WellTrack and BeeShopKiosk to integrate with MPS Auth for centralised login.

---

## WellTrack Integration Prompt

```
Build MPS Auth SSO integration into WellTrack.

MPS Auth is the school's centralised authentication portal running at:
  https://apps.mps.edu.vic.gov.au/auth

### How Login Works

When a user needs to log in to WellTrack:

1. Redirect them to MPS Auth with a return URL:
   https://apps.mps.edu.vic.gov.au/auth/login?redirect=https://welltrack.mps.edu.vic.gov.au/auth/callback

2. The user logs in at MPS Auth (email/password or Google).

3. MPS Auth redirects back to WellTrack with the token in the URL fragment:
   https://welltrack.mps.edu.vic.gov.au/auth/callback#mps_token=<JWT>

4. WellTrack reads `mps_token` from the URL fragment (never send it to the server via URL — it stays in the fragment), stores it in memory (not localStorage), and uses it as a Bearer token for all API calls to MPS Auth.

5. WellTrack calls the MPS Auth verify endpoint to confirm the token and get the user's identity and permissions:

   GET https://apps.mps.edu.vic.gov.au/auth/api/verify/
   Authorization: Bearer <mps_token>

   Response:
   {
     "user": {
       "id": "uuid",
       "email": "jane@mps.edu.vic.gov.au",
       "full_name": "Jane Smith",
       "is_active": true,
       "is_admin": true          ← MPS Auth system admin flag
     },
     "permissions": [
       {
         "app": { "id": "uuid", "name": "WellTrack", "slug": "welltrack" },
         "role": "admin",        ← "admin" or "non-admin"
         "permission_id": "uuid"
       }
     ]
   }

### Session Management

- Store the `mps_token` in React state / memory only. Never localStorage or sessionStorage.
- On each page load, call MPS Auth's token refresh endpoint to silently restore the session using the httpOnly cookie that MPS Auth set:
    POST https://apps.mps.edu.vic.gov.au/auth/api/token/refresh/
    (no body — uses the httpOnly cookie automatically)
  If this returns a new access_token, the user's session is restored.
  If it returns 401, redirect to the MPS Auth login page.

### WellTrack's Own Permission System

WellTrack MUST maintain its own fine-grained permission database. MPS Auth only controls login access and provides a coarse role ("admin" or "non-admin"). WellTrack decides what those roles mean internally.

Examples of fine-grained WellTrack permissions:
- Can view student wellbeing records
- Can create/edit wellbeing entries
- Can view reports
- Can manage WellTrack settings
- Can export data

When a user logs in via MPS Auth for the first time:
1. Look up the user in WellTrack's own database by email.
2. If they don't exist, create a WellTrack user record linked to their MPS Auth ID.
3. Apply the following automatic role mapping:

   if (mpsAuth.user.is_admin === true) {
     // Automatically grant full WellTrack admin permissions
     welltrack.grantRole(user, "welltrack_admin");
   } else if (mpsAuthPermission.role === "admin") {
     // Has WellTrack admin permission in MPS Auth
     welltrack.grantRole(user, "welltrack_admin");
   } else if (mpsAuthPermission.role === "non-admin") {
     // Has WellTrack access but not admin
     welltrack.grantRole(user, "welltrack_staff");
   } else {
     // Not listed in WellTrack permissions — deny access
     redirect to access denied page;
   }

4. Always defer to WellTrack's own permission records for what the user can do within the app. MPS Auth only determines if they can log in and what starting role to assign.

### Implementation Notes

- The `mps_token` is a signed JWT (HS256). Its expiry is 30 minutes. Use the token refresh flow above to get a new one silently.
- If the user's MPS Auth account is deactivated, the verify endpoint returns 401. Redirect them to the login page.
- Never cache the verify response for more than 5 minutes — always re-verify on protected operations.
- WellTrack should have its own logout that also calls:
    POST https://apps.mps.edu.vic.gov.au/auth/api/logout/
    Authorization: Bearer <mps_token>
  This clears the MPS Auth refresh token cookie so the user is fully signed out across all apps.

### Tech stack

The WellTrack backend should use httpx for all inter-service HTTP calls to MPS Auth. All endpoints must be async.
```

---

## BeeShopKiosk Integration Prompt

```
Build MPS Auth SSO integration into BeeShopKiosk.

MPS Auth is the school's centralised authentication portal running at:
  https://apps.mps.edu.vic.gov.au/auth

### How Login Works

When a staff member or admin needs to log in to BeeShopKiosk:

1. Redirect them to MPS Auth with a return URL:
   https://apps.mps.edu.vic.gov.au/auth/login?redirect=https://beeshopkiosk.mps.edu.vic.gov.au/auth/callback

2. The user logs in at MPS Auth (email/password or Google).

3. MPS Auth redirects back to BeeShopKiosk with the token in the URL fragment:
   https://beeshopkiosk.mps.edu.vic.gov.au/auth/callback#mps_token=<JWT>

4. BeeShopKiosk reads `mps_token` from the URL fragment (never send it to the server via URL), stores it in memory, and uses it as a Bearer token for all calls to MPS Auth.

5. BeeShopKiosk calls the MPS Auth verify endpoint to confirm the token:

   GET https://apps.mps.edu.vic.gov.au/auth/api/verify/
   Authorization: Bearer <mps_token>

   Response:
   {
     "user": {
       "id": "uuid",
       "email": "jane@mps.edu.vic.gov.au",
       "full_name": "Jane Smith",
       "is_active": true,
       "is_admin": true
     },
     "permissions": [
       {
         "app": { "id": "uuid", "name": "BeeShopKiosk", "slug": "beeshopkiosk" },
         "role": "admin",
         "permission_id": "uuid"
       }
     ]
   }

### Session Management

- Store `mps_token` in memory only, never localStorage.
- On page load, silently restore the session:
    POST https://apps.mps.edu.vic.gov.au/auth/api/token/refresh/
  If 401, redirect to MPS Auth login.

### BeeShopKiosk's Own Permission System

BeeShopKiosk MUST maintain its own fine-grained permission database. MPS Auth provides a starting role only. BeeShopKiosk decides what users can actually do.

Examples of BeeShopKiosk-specific permissions:
- Can process sales transactions
- Can apply discounts
- Can issue refunds
- Can manage inventory / stock levels
- Can view sales reports
- Can manage kiosk settings

When a user logs in for the first time:
1. Look up in BeeShopKiosk's database by email. Create the record if it doesn't exist.
2. Apply automatic role mapping:

   if (mpsAuth.user.is_admin === true) {
     // MPS system admin → full kiosk admin automatically
     kiosk.grantRole(user, "kiosk_admin");
   } else if (mpsAuthPermission.role === "admin") {
     kiosk.grantRole(user, "kiosk_admin");
   } else if (mpsAuthPermission.role === "non-admin") {
     kiosk.grantRole(user, "kiosk_operator");
   } else {
     // No BeeShopKiosk permission in MPS Auth — deny access
     redirect to access denied page;
   }

3. All subsequent permission checks use BeeShopKiosk's own records, not MPS Auth.

### Kiosk-Specific Considerations

- Kiosk devices may have long-running sessions. Use the token refresh endpoint proactively every 25 minutes to prevent the 30-minute access token from expiring mid-transaction.
- On kiosk logout (end of shift), call:
    POST https://apps.mps.edu.vic.gov.au/auth/api/logout/
    Authorization: Bearer <mps_token>
- If the verify endpoint returns 403 (user exists in MPS Auth but has no BeeShopKiosk permission), show a clear "Access not granted for BeeShopKiosk" message and redirect to the login page.

### Tech stack

The BeeShopKiosk backend should use httpx for all inter-service HTTP calls to MPS Auth. All endpoints must be async.
```

---

## MPS Auth Endpoint Reference

| Endpoint | Method | Auth required | Description |
|----------|--------|---------------|-------------|
| `/auth/api/login/` | POST | No | Email + password login |
| `/auth/api/token/refresh/` | POST | No (uses cookie) | Silent token refresh |
| `/auth/api/verify/` | GET | Yes — Bearer token | Verify JWT, get user + app permissions |
| `/auth/api/logout/` | POST | Yes — Bearer token | Clear session |

### Verify response shape

```json
{
  "user": {
    "id": "string (UUID)",
    "email": "string",
    "full_name": "string",
    "is_active": true,
    "is_admin": true
  },
  "permissions": [
    {
      "app": {
        "id": "string (UUID)",
        "name": "WellTrack",
        "slug": "welltrack"
      },
      "role": "admin",
      "permission_id": "string (UUID)"
    }
  ]
}
```

### Role meanings

| `is_admin` in user object | `role` in permissions | Recommended app action |
|---|---|---|
| `true` | any / missing | Grant full admin in the app |
| `false` | `"admin"` | Grant admin role in the app |
| `false` | `"non-admin"` | Grant standard staff role |
| `false` | missing (not in permissions) | Deny access |
