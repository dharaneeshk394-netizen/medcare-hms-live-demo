# MedCare Hospital Management System (HMS) — Commercial Design System & Figma Guide

Welcome to the official Design System and Figma-Ready Architecture Guide for **MedCare Hospital Management System (HMS)**, engineered for professional commercial deployment and sale on Envato/CodeCanyon.

---

## 1. Design Tokens & CSS Variables

The application is built on a robust, tokenized CSS architecture defined in `src/App.css`. All values are stored as CSS custom properties (`--*`), making them directly reproducible in Figma as Design Tokens and Local Variables.

### A. Color Palette
| Token Name | HEX / Value | Semantic Role |
| :--- | :--- | :--- |
| `--color-primary` | `#2563eb` | Primary Brand Blue (Actions, Active States, Focus) |
| `--color-primary-hover` | `#1d4ed8` | Primary Hover State |
| `--color-primary-active` | `#1e40af` | Primary Active / Pressed State |
| `--color-primary-light` | `#eff6ff` | Primary Light Surface / Tint |
| `--color-primary-subtle` | `#dbeafe` | Primary Subtle Border / Accent Fill |
| `--color-secondary` | `#475569` | Secondary Slate (Supporting UI Elements) |
| `--color-bg` | `#f8fafc` | Global Canvas Background |
| `--color-surface` | `#ffffff` | Elevated Card & Container Surface |
| `--color-surface-subtle` | `#f8fafc` | Table Header & Secondary Surface |
| `--color-border` | `#e2e8f0` | Standard Hairline Border |
| `--color-border-strong` | `#cbd5e1` | Strong Border / Focus Divider |
| `--color-text-primary` | `#0f172a` | Primary Heading & Body Text (Dark Slate) |
| `--color-text-secondary` | `#475569` | Secondary Text & Labels |
| `--color-text-muted` | `#64748b` | Muted Metadata & Captions |
| `--color-success` | `#16a34a` | Nominal / Active / Paid Status |
| `--color-success-bg` | `#dcfce7` | Success Badge Background |
| `--color-warning` | `#d97706` | Warning / Pending / Admitted Status |
| `--color-warning-bg` | `#fef3c7` | Warning Badge Background |
| `--color-error` | `#dc2626` | Alert / Critical / Overdue Status |
| `--color-error-bg` | `#fee2e2` | Error Badge Background |
| `--color-info` | `#0284c7` | Information / Partial Status |
| `--color-info-bg` | `#e0f2fe` | Info Badge Background |

### B. Typography
- **Font Family (`--font-sans`)**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Monospace & Tabular (`--font-mono`)**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- **Type Scale**:
  - Page Title (`--font-page-title`): `24px` (`1.5rem`), Weight: `700`, Line-Height: `1.25`
  - Section Title (`--font-section-title`): `18px` (`1.125rem`), Weight: `600`, Line-Height: `1.35`
  - Card Title (`--font-card-title`): `15px` (`0.9375rem`), Weight: `600`, Line-Height: `1.4`
  - Body Prose (`--font-body`): `14px` (`0.875rem`), Weight: `400`, Line-Height: `1.5`
  - Small Text (`--font-small`): `13px` (`0.8125rem`), Weight: `400`, Line-Height: `1.45`
  - Caption (`--font-caption`): `12px` (`0.75rem`), Weight: `500`, Line-Height: `1.4`
  - Tabular Numerals (`tabular-nums`): Mandatory for all numeric tables, invoices, timestamps, and financial figures.

### C. Spacing Scale (4px Base Grid)
- `--space-4` = `4px`
- `--space-8` = `8px`
- `--space-12` = `12px`
- `--space-16` = `16px` (`1rem`)
- `--space-20` = `20px`
- `--space-24` = `24px`
- `--space-32` = `32px`
- `--space-40` = `40px`
- `--space-48` = `48px`
- `--space-64` = `64px`

### D. Border Radius
- `--radius-xs`: `4px` (Tags, inner badges)
- `--radius-sm`: `6px` (Small buttons, inputs)
- `--radius-md`: `8px` (Standard buttons, cards, modals)
- `--radius-lg`: `12px` (Large container cards, tables)
- `--radius-pill`: `9999px` (Status badges, avatars)

### E. Shadows & Elevation
- `--shadow-subtle`: `0 1px 2px 0 rgba(15, 23, 42, 0.05)`
- `--shadow-card`: `0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.04)`
- `--shadow-card-hover`: `0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)`
- `--shadow-modal`: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`
- `--shadow-focus`: `0 0 0 3px rgba(37, 99, 235, 0.2)`

### F. Layout & Motion
- Sidebar Width: `256px`
- Header Height: `64px`
- Content Max Width: `1440px`
- Page Padding: `24px`
- Motion Transition: `150ms cubic-bezier(0.16, 1, 0.3, 1)` (with `@media (prefers-reduced-motion: reduce)` support).

---

## 2. Reusable Component Specifications

### A. Buttons (`Button.jsx`)
- **Variants**: `primary`, `secondary`, `outline`, `danger`, `danger-solid`, `ghost`
- **Sizes**: `sm` (32px height), `md` (40px height), `lg` (48px height)
- **States**: Normal, Hover, Active, Focus-Visible (`--shadow-focus`), Loading (`aria-busy="true"` with CSS spinner), Disabled (`opacity: 0.55`).

### B. Form Controls (`FormControls.jsx`)
- **Components**: `FormGroup`, `Input`, `SearchInput`, `Select`, `Textarea`
- **Specs**: Height `40px`, padding `8px 12px`, border `1px solid var(--color-border)`, radius `var(--radius-md)`. Supports required indicator, helper text, and inline error validation states (`--color-error`).

### C. Tables (`App.css`)
- **Specs**: Container with `overflow-x: auto`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-lg)`.
- **Header**: Background `var(--color-surface-subtle)`, font-size `13px`, font-weight `600`, color `var(--color-text-secondary)`.
- **Rows**: Hover highlight `var(--color-surface-subtle)`, `tabular-nums` for numerical data.

### D. Status Badges (`StatusBadge.jsx`)
- **Anti-Slop Zero-Pill Standard**: Clean inline badge with subtle background tint, matching text color, subtle border, and 6px indicator dot.
- **Statuses Supported**: `Active`, `Inactive`, `Scheduled`, `Completed`, `Cancelled`, `Admitted`, `Discharged`, `Transferred`, `Pending`, `Partial`, `Paid`, `Overdue`, `On Leave`, `Archived`, `Amended`.

### E. Modals (`Modal.jsx`)
- **Specs**: Accessible dialog pattern with `role="dialog"`, `aria-modal="true"`, background backdrop blur (`backdrop-filter: blur(2px)`), ESC key dismissal, focus management, and smooth fade-in animation.

### F. Alerts (`Alert.jsx`)
- **Types**: `info`, `success`, `warning`, `error`
- **Specs**: Icon indicator, title, message body, optional close button, appropriate ARIA roles (`role="alert"` for errors/warnings, `role="status"` for info/success).

---

## 3. Figma Token & Component Recreation Guide

To set up this design system in Figma:

1. **Local Variables & Color Styles**:
   - Create a Color Collection with categories: `Brand`, `Neutral`, `Surface`, `Border`, `Text`, `Success`, `Warning`, `Error`, `Info`. Assign the exact HEX values from Section 1A.
2. **Typography Styles**:
   - Define text styles matching Section 1B (`Page Title`, `Section Title`, `Card Title`, `Body`, `Small`, `Caption`, `Tabular`).
3. **Spacing & Auto-Layout**:
   - Set up Auto-Layout padding and gaps using multiples of 4px (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`).
4. **Component Library Structure**:
   - **Foundations**: Colors, Typography, Grids, Shadows.
   - **Components**: Button (variants & sizes), Input Fields, Checkboxes, Status Badges, Icons (24x24 grid), Cards, Modals, Alert Banners, Pagination.
   - **Patterns**: Data Table with Actions, Filter Toolbar, Detail Record View, Form Layout.
   - **Pages**: Dashboard, Patients List, Doctor Profiles, Appointments, Billing & Invoices, Pharmacy Dispensing, Laboratory Test Orders, System Settings.
