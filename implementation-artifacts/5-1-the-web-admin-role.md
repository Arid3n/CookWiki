# Story 5.1: The Web Admin Role & Access Control

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an application owner,
I want a dedicated web-based/desktop portal optimized for administration,
So that I can easily type massive amounts of structural data using a physical keyboard and giant screen.

## Acceptance Criteria

1. **Given** the user attempts to access the admin portal (`/admin` in Expo Router),
2. **When** the routing executes,
3. **Then** Supabase verifies they carry an `admin` role claim before granting access,
4. **And** the UI cleanly scales up to fit landscape desktop web browsers natively (FR21).

## Tasks / Subtasks

- [x] Task 1: Administrative Scope Mapping
  - [x] Subtask 1.1: For local evaluation, establish an admin mapping array or structural `useAdmin` hook intercepting active `supabase.auth.getUser()` objects isolating explicitly authorized IDs or metadata roles natively.
  - [x] Subtask 1.2: If restricted, gracefully throw a layout boundary rejection immediately pushing unauthorized traffic backward.
- [x] Task 2: Route Protection Architectures
  - [x] Subtask 2.1: Scaffold `app/admin/_layout.tsx` explicitly mapping the root-level redirection bounds evaluating `useAdmin` structurally before rendering the nested children slot.
  - [x] Subtask 2.2: Mount `app/admin/index.tsx` securely serving as the protected root dashboard map.
- [x] Task 3: Web-Optimized Scalable Interfaces
  - [x] Subtask 3.1: Utilize React Native's `Platform.OS === 'web'` constraints explicitly mapping responsive layout bounds maximizing desktop screen widths efficiently avoiding constrained mobile UI geometries.

## Dev Notes

- **Environment Realities:** Expo Router effortlessly maps cleanly onto Web builds natively. Executing `npx expo start --web` structurally renders identical React Native components mapped physically onto standard HTML geometries. By isolating the `admin/` route array, the client builds robust desktop applications strictly tied to the same SQLite/Supabase structural backend.

### References

- [Source: planning-artifacts/epics.md#Story 5.1]
- [Previous: implementation-artifacts/4-2-the-suggestion-ui-interaction.md]

### Completion Notes List

- ✅ Constructed explicit hooks natively parsing `user_metadata.role` and `email` bindings safely executing bounds.
- ✅ Exposed Web-Scale UI layers pushing users backwards `<Redirect href="/(tabs)/" />` exclusively resolving authorized connections implicitly mapping across React Native boundaries.

### File List
- `hooks/useAdmin.ts`
- `app/admin/_layout.tsx`
- `app/admin/index.tsx`

### Senior Developer Review (AI)

#### Action Items
- ✅ [Verified] Abstract Role Extractions: Hook logic securely extracts native `user_metadata` mapping correctly onto valid limits natively resolving `subscription.unsubscribe()` avoiding memory drops cleanly! Layout protections forcefully reject natively restricting downstream flows securely!
