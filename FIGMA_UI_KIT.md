# MedCare Hospital Management System (HMS) — Figma Design System & UI Kit Specification

**Product Name:** MedCare Hospital Management System (HMS)  
**Version:** 1.0.0  
**Target Platform:** React 18 + Vite + Tailwind / CSS Design Tokens + Express + PostgreSQL  
**Intended Marketplace:** Envato / CodeCanyon Professional Commercial Release

---

## 1. Overview & Design Philosophy

MedCare HMS is designed as a professional enterprise healthcare product. The user interface emphasizes clinical clarity, uncompromising accessibility, rapid data scanning, and high-density information layout without visual fatigue.

### Core Design Principles
1. **Clinical Trust & Neutrality:** Clean white and light slate surfaces (`#ffffff`, `#f8fafc`) paired with authoritative medical blue (`#0284c7` / `#0ea5e9`) and reassuring semantic status colors.
2. **High Information Density:** Optimized table padding, compact badges, and clear hierarchy allow medical staff to review records, lab results, and appointments instantly.
3. **WCAG AA Accessibility:** Full keyboard navigation, visible focus rings (`2px solid var(--color-primary)`), high contrast ratios (minimum 4.5:1 for body text), and screen reader support (`aria-live`, `role="dialog"`, `role="alert"`).
4. **Figma Component Parity:** Every UI element in code is structured with exact token equivalence so designers can build 1:1 matching Figma component libraries.

---

## 2. Design Tokens

The application design system is fully tokenized in `src/App.css` using CSS custom properties (`:root`).

### 2.1 Color Palette

| Token Name | Hex / Value | Usage Description |
| :--- | :--- | :--- |
| `--color-primary` | `#0284c7` | Primary brand blue, primary buttons, active tabs, main links |
| `--color-primary-hover` | `#0369a1` | Hover state for primary buttons and interactive elements |
| `--color-primary-light` | `#e0f2fe` | Soft background tint for selected states and active badges |
| `--color-secondary` | `#475569` | Secondary actions, muted headers, neutral badges |
| `--color-success` | `#10b981` | Completed, Paid, Active, Normal lab results |
| `--color-success-bg` | `#d1fae5` | Success badge background |
| `--color-warning` | `#f59e0b` | Pending, Low Stock, Warning notices |
| `--color-warning-bg` | `#fef3c7` | Warning badge background |
| `--color-danger` | `#ef4444` | Critical, Cancelled, Overdue, Error states |
| `--color-danger-bg` | `#fee2e2` | Danger badge background |
| `--color-surface` | `#ffffff` | Card background, modal background, table surface |
| `--color-surface-muted`| `#f8fafc` | Page background, table header background |
| `--color-border` | `#e2e8f0` | Standard border color for cards, tables, inputs |
| `--color-border-focus` | `#0284c7` | Focused input border |
| `--color-text-primary`| `#0f172a` | Primary headings, table data text |
| `--color-text-secondary`| `#334155`| Secondary labels, subtitle text |
| `--color-text-muted` | `#64748b` | Muted descriptions, placeholders, timestamps |

### 2.2 Typography Scale

| Token / Role | Font Size | Line Height | Font Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--font-page-title` | `1.5rem` (24px) | `1.3` | `700` (Bold) | Main page headings |
| `--font-section-title`| `1.125rem` (18px) | `1.4` | `600` (SemiBold) | Section headers, card titles |
| `--font-card-title` | `0.9375rem` (15px)| `1.4` | `600` (SemiBold) | Table headers, modal titles |
| `--font-body` | `0.875rem` (14px) | `1.5` | `400` (Regular) | Body text, form labels, inputs |
| `--font-table` | `0.875rem` (14px) | `1.4` | `400` (Regular) | Table cell data |
| `--font-small` | `0.75rem` (12px) | `1.4` | `500` (Medium) | Badges, captions, helper text |

### 2.3 Spacing Scale

Based on a 4px grid system:
- `--space-1`: `4px`
- `--space-2`: `8px`
- `--space-3`: `12px`
- `--space-4`: `16px`
- `--space-5`: `24px`
- `--space-6`: `32px`
- `--space-8`: `48px`

### 2.4 Border Radius

- `--radius-sm`: `4px` (Badges, small buttons)
- `--radius-md`: `6px` (Inputs, dropdowns, table cells)
- `--radius-lg`: `8px` (Cards, modals, containers)
- `--radius-full`: `9999px` (Pill badges, avatars)

### 2.5 Shadows & Elevation

- `--shadow-sm`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` (Subtle cards)
- `--shadow-md`: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` (Standard cards, dropdowns)
- `--shadow-lg`: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)` (Modals, popovers)

---

## 3. UI Component Specifications & React API

### 3.1 Button Component (`src/components/Button.jsx`)
- **Variants:** `primary`, `secondary`, `outline`, `danger`, `ghost`
- **Sizes:** `sm`, `md`, `lg`
- **States:** Default, Hover, Active, Focus-Visible, Disabled, Loading (with spinner)
- **Props:** `variant`, `size`, `isLoading`, `leftIcon`, `rightIcon`, `fullWidth`, `disabled`, `onClick`, `type`, `children`

### 3.2 Alert & Feedback Banner (`src/components/Alert.jsx`)
- **Types:** `info`, `success`, `warning`, `error`
- **Features:** Icon indicator, bold title, message body, optional dismiss button (`onClose`), ARIA `role="alert"`

### 3.3 Card Component Suite (`src/components/Card.jsx`)
- **Components:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- **Styling:** White surface, border `--color-border`, radius `--radius-lg`, padding `--space-5`, subtle shadow.

### 3.4 Modal Dialog (`src/components/Modal.jsx`)
- **Accessibility:** `role="dialog"`, `aria-modal="true"`, focus trapping, ESC key dismissal, backdrop click handling.
- **Anatomy:** Header (Title + Close X button), Scrollable Body Content, Footer (Cancel/Submit buttons).

### 3.5 Pagination Controls (`src/components/Pagination.jsx`)
- **Anatomy:** Left status summary ("Showing 1-10 of 45 records"), Previous button, Page number buttons with ellipsis and active state, Next button.

### 3.6 Form Controls Suite (`src/components/FormControls.jsx`)
- **Components:** `FormGroup`, `Input`, `Select`, `Textarea`, `SearchInput`
- **Features:** Label with required asterisk, helper text, error message, aria-invalid attributes, uniform height (`40px` for md inputs), consistent focus ring.

### 3.7 Status Badge (`src/components/StatusBadge.jsx`)
- **Variants:** `success`, `warning`, `danger`, `info`, `neutral`
- **Styling:** Pill shape (`--radius-full`), font-size `--font-small`, semantically paired background and text colors.

### 3.8 Empty State (`src/components/EmptyState.jsx`)
- **Anatomy:** Circular muted icon container, bold title, description text, optional call-to-action button.

### 3.9 Loading Skeleton (`src/components/LoadingSkeleton.jsx`)
- **Features:** Shimmer animation placeholder for tables, cards, and dashboards while data is loading asynchronously.

---

## 4. Figma UI Kit Structuring Guide

To recreate this Design System in Figma:

1. **Local Variables Setup:**
   - Create Color Collections in Figma matching Section 2.1.
   - Create Typography Styles matching Section 2.2.
   - Create Spacing tokens as number variables.

2. **Master Components (Components / Atoms / Molecules):**
   - **Buttons:** Create component sets with variants for `Variant` (`Primary`, `Secondary`, `Outline`, `Danger`, `Ghost`) and `Size` (`Sm`, `Md`, `Lg`) plus boolean properties for `Loading` and `Disabled`.
   - **Form Inputs:** Create text input components with states (`Default`, `Hover`, `Focus`, `Error`, `Disabled`).
   - **Badges:** Create badge component with status variant property.
   - **Cards & Modals:** Build auto-layout containers using surface background and shadows.

3. **Page Templates:**
   - Use Dashboard, Patient List, Appointment Scheduler, and Billing Invoices as template artboards (Desktop 1440px width, Tablet 768px width, Mobile 375px width).
