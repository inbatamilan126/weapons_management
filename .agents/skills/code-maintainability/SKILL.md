---
name: code-maintainability
description: Standards and rules for writing human-readable, modular, maintainable code. Enforces strict file size limits (< 300 LOC), Single Responsibility Principle (SRP), clean separation of concerns, and component decomposition. MANDATORY TRIGGER: Activate when creating, editing, refactoring, or reviewing React components, hooks, utilities, or page views.
---

# Code Maintainability & Readability Guide (`code-maintainability`)

This skill defines strict guidelines to ensure that all code in this repository remains **human-readable, modular, well-structured, and easy to maintain**.

---

## 1. Strict File Size & Complexity Limits

### 📏 The 300-Line Rule
- **No component or view file should exceed 300 lines of code (LOC)**. Hard limit is 400 LOC for exceptional edge cases.
- **Never write monolithic files** (e.g. 800–1000+ LOC files containing full pages, forms, modals, and logic all in one place).
- If a file approaches ~250 lines during development, proactively split it into:
  1. Smaller focused sub-components.
  2. Custom hooks for state and side-effects.
  3. Utility helper functions.

---

## 2. Single Responsibility Principle (SRP) & Architectural Boundaries

Every file should have **one clear responsibility**:

```
src/
├── components/
│   ├── common/           # Generic reusable UI primitives (Button, Modal, Input, Badge, Card)
│   ├── layout/           # App shell, Navbar, Sidebar, PageContainer
│   └── modules/          # Feature-specific sub-components
│       ├── inventory/    # WeaponCard, ConditionBadge, WeaponFilterBar, WeaponHistoryTable
│       ├── issues/       # IssueForm, StudentSelectorModal, ReturnIssueModal
│       ├── students/     # StudentCard, StudentIssueHistory
│       └── users/        # UserPermissionMatrix, UserRoleBadge
├── hooks/                # Business logic, state management, API data queries (useWeapons, usePermissions)
├── services/             # Supabase client helpers & API endpoints
├── types/                # Centralized TypeScript types & database schemas
└── utils/                # Pure formatting, date math, validation helpers
```

### Layer Rules:
- **UI Components** (`src/components/`): Focus strictly on rendering markup and dispatching user events. Avoid inline fetch/query logic or complex data transformations.
- **Custom Hooks** (`src/hooks/`): Encapsulate data fetching, state management, and side effects.
- **Utilities** (`src/utils/`): Pure functions with no React or DOM dependencies. Easily testable.

---

## 3. Component Extraction & Decomposition Guidelines

### ❌ Anti-Pattern: Inline Modals, Giant Forms, and Nested Lists
```tsx
// DON'T: 800-line Page component with inline modals, inline tables, inline forms
export function InventoryPage() {
  // 50 lines of state
  // 100 lines of query logic
  // 450 lines of inline table rendering
  // 200 lines of inline modal rendering
}
```

### ✅ Clean Pattern: Sub-Component Breakdown
```tsx
// DO: Clean top-level page (< 100 LOC) assembling decomposed components
export function InventoryPage() {
  const { weapons, isLoading, filters, setFilters } = useWeapons();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <PageContainer title="Inventory Management">
      <InventoryHeader onAddWeapon={() => setIsAddModalOpen(true)} />
      <InventoryFilterBar filters={filters} onChange={setFilters} />
      <InventoryTable data={weapons} isLoading={isLoading} />
      <AddWeaponModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </PageContainer>
  );
}
```

---

## 4. Readability & Code Hygiene Rules

1. **Clear, Self-Documenting Naming**:
   - Variables: `isReturnModalOpen`, `activeStudentId`, `weaponCondition`
   - Functions: `handleReturnWeapon`, `calculateDueDate`, `filterWeaponsByCategory`
   - Custom Hooks: `useWeapons`, `useIssueWeapon`, `usePermissions`
2. **JSX Nesting Limit**:
   - Keep JSX nesting under **4 levels deep**. Extract deeply nested lists or multi-step cards into sub-components.
3. **Explicit TypeScript Types**:
   - Never use `any`. Always import or derive explicit types from database schemas or shared type definitions.
4. **Clean Exports**:
   - Use named exports (`export function WeaponCard() { ... }`) for components and hooks to improve auto-imports and refactoring safety.
