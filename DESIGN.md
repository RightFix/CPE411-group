```yaml
brand: CPE 411 — Groupings
mood: Warm, focused, and academic, offering a soft and approachable interface for discovering course groupings and selecting presentation subtopics and roles.
scheme: light

colors:
  primary: "#0067f5"
  primary-bright: "#1a7aff"
  primary-deep: "#0052c4"
  on-primary: "#fffefa"
  ink: "#2d241b"
  ink-soft: "#56584f"
  on-ink: "#eaece2"
  canvas: "#f8f7f4"
  paper: "#fffefa"
  cloud: "#f4f3ee"
  hairline: "#eaece2"
  hairline-strong: "#e5e4df"
  link: "#2d241b"
  link-pressed: "#292a26"
  accent-tag-violet: "#eeecf7"
  accent-tag-blue: "#e6f0f6"
  accent-tag-green: "#e5f2e8"
  accent-tag-subtle-green: "#8a9a7b"
  accent-tag-grey: "#a3a69a"
  error: "#b42318"
  error-bg: "#fef3f2"
  success: "#166534"
  success-bg: "#e5f2e8"

typography:
  display-xl: { fontFamily: "DM Sans Variable", fontSize: 60px, fontWeight: 700, lineHeight: 1.1 }
  display-lg: { fontFamily: "DM Sans Variable", fontSize: 36px, fontWeight: 600, lineHeight: 1.2 }
  display-md: { fontFamily: "DM Sans Variable", fontSize: 30px, fontWeight: 500, lineHeight: 1.25 }
  body-lg: { fontFamily: "Figtree", fontSize: 18px, fontWeight: 500, lineHeight: 1.4 }
  body-md: { fontFamily: "Figtree", fontSize: 16px, fontWeight: 400, lineHeight: 1.5 }
  body-emphasis: { fontFamily: "Figtree", fontSize: 16px, fontWeight: 600, lineHeight: 1.5 }
  caption-md: { fontFamily: "Figtree", fontSize: 12px, fontWeight: 420, lineHeight: 1.5 }
  caption-sm: { fontFamily: "Figtree", fontSize: 11px, fontWeight: 500, lineHeight: 1, letterSpacing: 0.2px, textTransform: uppercase }
  button-md: { fontFamily: "Figtree", fontSize: 14px, fontWeight: 500, lineHeight: 1, letterSpacing: -0.16px }
  link-md: { fontFamily: "Figtree", fontSize: 14px, fontWeight: 500, lineHeight: 1.5 }
  code-md: { fontFamily: "DM Mono", fontSize: 14px, fontWeight: 400, lineHeight: 1.5 }

rounded:
  none: 0px
  sm: 8px
  md: 14px
  lg: 22px
  xl: 36px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section-sm: 80px
  section-md: 96px
  section-lg: 128px

shadows:
  none: "none"
  soft-lift: "rgba(41, 42, 38, 0.05) 0px 1px 2px 0px, rgba(41, 42, 38, 0.06) 0px 4px 12px 0px"
  card: "rgba(41, 42, 38, 0.06) 0px 2px 6px 0px, rgba(41, 42, 38, 0.1) 0px 12px 28px 0px"
  modal: "rgba(41, 42, 38, 0.1) 0px 8px 24px 0px, rgba(41, 42, 38, 0.16) 0px 32px 64px 0px"

motion:
  duration-fast: "150ms"
  duration-base: "220ms"
  duration-slow: "400ms"
  ease-standard: "cubic-bezier(0.4, 0, 0.2, 1)"
  ease-out: "cubic-bezier(0.23, 1, 0.32, 1)"
  ease-emphasized: "cubic-bezier(0.34, 1.56, 0.64, 1)"
  transition-default: "color {motion.duration-fast} {motion.ease-standard}, background-color {motion.duration-fast} {motion.ease-standard}, border-color {motion.duration-fast} {motion.ease-standard}, box-shadow {motion.duration-fast} {motion.ease-standard}"
  transition-transform: "transform {motion.duration-base} {motion.ease-out}"

focus:
  style: "outline"
  width: "2px"
  color: "{colors.primary}"
  offset: "2px"
  ring: "none"

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    color: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "14px 20px"
    shadow: "{shadows.soft-lift}"
    typography: "{typography.button-md}"
    cursor: "pointer"
  button-primary-hover:
    backgroundColor: "{colors.primary-bright}"
    shadow: "{shadows.card}"
    transform: "translateY(-1px)"
  button-primary-active:
    backgroundColor: "{colors.primary-deep}"
    transform: "scale(0.97)"
  button-secondary:
    backgroundColor: "{colors.paper}"
    color: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    border: "1px solid {colors.hairline-strong}"
    shadow: "{shadows.none}"
    typography: "{typography.button-md}"
    cursor: "pointer"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
    shadow: "{shadows.none}"
    border: "1px solid {colors.hairline}"
  card-hover:
    shadow: "{shadows.none}"
    transform: "translateY(-2px)"
  navigation:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.md}"
    shadow: "{shadows.card}"
  nav-link:
    color: "{colors.ink-soft}"
    typography: "{typography.link-md}"
    padding: "{spacing.xs} {spacing.sm}"
    rounded: "{rounded.sm}"
    cursor: "pointer"
  nav-link-active:
    color: "{colors.ink}"
    fontWeight: "600"
    backgroundColor: "{colors.canvas}"
  input-select:
    backgroundColor: "{colors.paper}"
    color: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    shadow: "{shadows.none}"
    border: "1px solid {colors.hairline}"
    typography: "{typography.body-md}"
    cursor: "pointer"
  tag:
    backgroundColor: "{colors.accent-tag-violet}"
    color: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xxs} {spacing.sm}"
    typography: "{typography.caption-sm}"
```

## Visual Theme & Atmosphere
**CPE 411 — Groupings** adopts a warm, scholarly, and exceptionally clean visual theme. It cultivates an atmosphere of focused academic organization by using a soft, organic paper-and-ink palette and gentle, rounded forms. The design feels modern yet timeless, like a well-organized digital syllabus and group roster. It prioritizes clarity, mobile-first ergonomics, and approachability so students can quickly find their group, select their subtopic and role, and verify team coverage without visual clutter.

**Key Characteristics:**
* **Warm & Earthy Palette with Cobalt Blue Accent:** The core of the design is a warm off-white `{colors.canvas}` (`#f8f7f4`) and rich brown-black `{colors.ink}` (`#2d241b`), accented by a crisp, authoritative `{colors.primary}` cobalt blue (`#0067f5`).
* **Soft Elevation:** Interactive surfaces like cards, floating navigation bars, and custom select popovers sit on `{colors.paper}` (`#fffefa`), distinguished by soft, multi-layered shadows (`{shadows.card}`).
* **Consistent Roundness:** A generous and consistent rounding scale, from `{rounded.sm}` (`8px`) on buttons and inputs to `{rounded.md}` (`14px`) on cards and navigation.
* **Paired Typography:** Display headings (`display-xl`, `display-lg`, `display-md`) are set in **DM Sans Variable**, while all body copy, controls, captions, and UI labels use **Figtree**, paired with **DM Mono** for registration numbers (`22/EG/CO/...`) and tabular counts.
* **Minimalist Pastel Accents:** Pastel hues (`{colors.accent-tag-violet}`, `{colors.accent-tag-blue}`, `{colors.accent-tag-green}`) are reserved exclusively for role badges and informative status tags.
* **Focus Treatment (No Rings):** Buttons, links, and custom select triggers use a crisp `2px solid #0067f5` CSS `outline` with `2px` offset, while text inputs highlight their border color (`#0067f5`) on focus—never `box-shadow` focus rings.
* **Tactile & Mobile-Native Interactions:** Buttons provide immediate `:active` press feedback (`scale(0.97)`), hover states are gated behind `@media (hover: hover) and (pointer: fine)` so touch taps never stick, and inputs use a minimum `16px` font size to prevent iOS Safari auto-zoom.

## Color Usage Rules
* **Primary Surfaces:** Main page background is `{colors.canvas}` (`#f8f7f4`). Secondary bands or subtle containers use `{colors.cloud}` (`#f4f3ee`). Pure `#ffffff` is never used.
* **Elevated Surfaces:** Cards, floating navigation, tables, and dropdown menus use `{colors.paper}` (`#fffefa`).
* **Primary & Secondary Text:** Default text is `{colors.ink}` (`#2d241b`); metadata, helper text, and secondary labels use `{colors.ink-soft}` (`#56584f`).
* **Primary Action Color:** `{colors.primary}` (`#0067f5`) is reserved for primary calls-to-action, active tab/selection indicators, and focus outlines. Text on `{colors.primary}` always uses `{colors.on-primary}` (`#fffefa`).
* **Accent Tags:** `{colors.accent-tag-violet}`, `{colors.accent-tag-blue}`, and `{colors.accent-tag-green}` are used only for role badges (`Slide Creator`, `Researcher`, `Presenter`) and compact status pills.
* **Borders:** Subtle dividers use `{colors.hairline}` (`#eaece2`); interactive secondary borders use `{colors.hairline-strong}` (`#e5e4df`).

## Custom Component Inventory
All UI primitives live in `src/components/ui/`:
* `Button` — Primary, secondary, and ghost variants with `:active` press scale and outline focus.
* `Card` — Elevated paper container with optional interactive hover lift and cloud variant.
* `Input` — Accessible text input with label, hint/error state, `16px` mobile-safe sizing, and outline focus.
* `Select` — Custom accessible listbox/dropdown component (with keyboard navigation, origin-aware animation, and mobile-friendly touch targets) replacing native `<select>` and ad-hoc menus.
* `Table` — Structured desktop data table (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`) with tabular numerals and clean hairline dividers.
* `Badge` — Pill-shaped semantic tag for roles (`presenter`, `research`, `slides`) and user/group indicators.
* `Navbar` — Floating `{colors.paper}` navigation header with user identity pill and responsive actions.
