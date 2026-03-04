

## Fix: create-user-auth returns 400 when email already exists

### Root cause
The edge function calls `auth.admin.createUser()` which fails with `email_exists` if the email is already registered in Auth. This happens when the user tried to create access for an email that was previously registered (e.g. via the super admin flow). The function should handle this by looking up the existing Auth user instead of failing.

Additionally, the CORS headers are missing required Supabase client headers, which can cause preflight failures.

### Changes

#### 1. `supabase/functions/create-user-auth/index.ts`
- Update CORS headers to include all required Supabase client headers
- When `createUser` fails with `email_exists`, use `auth.admin.listUsers()` to find the existing user by email and return their ID
- Optionally update the password for the existing user using `auth.admin.updateUserById()`

```
Flow:
1. Try createUser(email, password)
2. If error.message contains "already been registered":
   a. List users filtered by email
   b. Get existing user ID
   c. Update password with updateUserById
   d. Return { auth_user_id: existingUser.id }
3. Otherwise return error as before
```

#### 2. Republish the app
The CSS MIME error on the published URL is due to stale build assets. A republish will fix this.

### Files modified
- `supabase/functions/create-user-auth/index.ts`

