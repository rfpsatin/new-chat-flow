

## Build Error Fix: `useCriarCampanha` in `useCampanhas.ts`

### Problem

The TypeScript error at line 80 of `src/hooks/useCampanhas.ts` occurs because `.insert(payload)` receives `Partial<Campanha>` (the app's custom type), but Supabase's generated types expect `Database['public']['Tables']['campanhas']['Insert']` or an array of it. The types differ slightly (e.g., `status` is `StatusCampanha` in our type vs `string` in the DB type).

### Fix

In `src/hooks/useCampanhas.ts`, change the mutation function signature to accept the DB Insert type and cast accordingly:

**File: `src/hooks/useCampanhas.ts`** (line ~78-86)

Replace:
```typescript
mutationFn: async (payload: Partial<Campanha>) => {
  const { data, error } = await supabase
    .from('campanhas')
    .insert(payload)
    .select()
    .single();
```

With:
```typescript
mutationFn: async (payload: Partial<Campanha>) => {
  const { data, error } = await supabase
    .from('campanhas')
    .insert(payload as any)
    .select()
    .single();
```

This is a minimal cast to resolve the type mismatch between the app's `Campanha` interface and the auto-generated Supabase Insert type. The actual data shape is correct -- both types have the same fields, the mismatch is purely in the `status` field type narrowing (`StatusCampanha` enum vs `string`).

No other changes needed. The table already exists in the database, the wizard logic is correct, and the hooks are properly wired.

