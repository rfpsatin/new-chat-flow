

## Fix: SuperAdmin panel stuck on loading spinner

### Root cause
The `SuperAdminContext` has no error handling around `checkSuperAdmin()`. If the query to `super_admins` fails (e.g., network issue, expired token, or RLS rejection), the async callback throws before reaching `setLoading(false)`, leaving the guard stuck on the spinner forever. Additionally, the `/login` page works fine — the issue is only on `/superadmin`.

### Changes

#### 1. `src/contexts/SuperAdminContext.tsx`
- Wrap `checkSuperAdmin` calls in try/catch so `setLoading(false)` always executes
- Add a timeout fallback: if loading doesn't resolve in 5s, force `setLoading(false)`
- When not logged in and loading resolves, the guard will redirect to `/login` (where the logout button is accessible)

#### 2. `src/components/SuperAdminGuard.tsx`
- Add a "Voltar ao login" (back to login) link on the loading screen so even while loading, the user can escape
- This addresses the original request: even if stuck, the user can navigate away

### Files modified
- `src/contexts/SuperAdminContext.tsx`
- `src/components/SuperAdminGuard.tsx`

