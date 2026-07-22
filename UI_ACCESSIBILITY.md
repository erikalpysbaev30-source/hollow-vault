# Hollow Vault UI accessibility

## Rendered audit

The pre-change 1366×768 render showed main-menu actions at 9 px, settings labels at 10 px, settings helper text at 7 px, selects at 8 px, AI Director explanations at 10–11 px, and HUD metadata at 6–7 px. Several muted colors were also used on nearly black transparent surfaces without a stable backdrop. Focus used a thin 2 px outline, most controls were below a 44 px hit area, toggles communicated state mainly through color and position, and extra-large text had no supported scaling or layout response.

The implementation now uses a final cascade in `app/accessibility.css`; it centralizes readable sizes and accessible colors while preserving the original dark rift palette, Arial display/body family, monospace metadata, angular shapes, and cyan/gold/red identity.

## Typography scale

| Token | Default |
|---|---:|
| `--font-size-xs` | 12 px, nonessential metadata only |
| `--font-size-sm` | 14 px, secondary labels and helper text |
| `--font-size-base` | 16 px, body text and controls |
| `--font-size-md` | 18 px |
| `--font-size-lg` | 22 px |
| `--font-size-xl` | 28 px |
| `--font-size-2xl` | 36 px |

Line heights are 1.2, 1.5, and 1.65. Important menu, settings, dashboard, modal, and HUD text uses the base size or larger. The 12 px tier is restricted to short, nonessential metadata.

## Color tokens and measured contrast

| Use | Token | Value | Tested pair | Ratio |
|---|---|---|---|---:|
| Main background | `--color-bg-main` | `#090813` | — | — |
| Panel | `--color-bg-panel` | `#11131f` | — | — |
| Elevated panel | `--color-bg-panel-elevated` | `#191b2a` | — | — |
| Primary text | `--color-text-primary` | `#f7f1df` | Main background | 17.62:1 |
| Secondary text | `--color-text-secondary` | `#c8d1ce` | Panel | 11.85:1 |
| Muted text | `--color-text-muted` | `#aebbb8` | Panel | 9.32:1 |
| Accent | `--color-accent` | `#78e5dc` | Main background | 13.30:1 |
| Focus/warning | `--color-focus` | `#ffd166` | Main background | 13.79:1 |
| Success | `--color-success` | `#9fe8aa` | — | — |
| Danger | `--color-danger` | `#ff9b9b` | — | — |

Ratios use the WCAG relative-luminance formula and are regression-tested. HUD content uses a nearly opaque dark panel and text shadow so the same values remain legible across every map style.

## Player settings

UI Scale is persisted in the existing local save under `settings.uiScale`. Supported values are Small (0.9), Default (1), Large (1.15), and Extra Large (1.3). Unknown or tampered values normalize to Default. Scaling changes interface typography, controls, and HUD furniture only; it does not change the Canvas, camera, collision space, or gameplay world.

High Contrast UI uses the existing persisted `settings.highContrast` preference. It brightens all three text levels, strengthens borders and panels, increases disabled-state clarity, and retains the same cyan/gold visual identity. It does not recolor game-world art.

## Responsive and interaction checks

Rendered checks cover 320×568, 375×667, 768×1024, 1366×768, and 1920×1080. Main menu, settings, AI Director, and HUD were checked for horizontal overflow; Default and Extra Large were checked for clipping. Mobile menus and dashboard timelines stack, long labels wrap, selects expand on narrow screens, and HUD furniture stays inside the viewport.

All interactive controls have at least a 44×44 default target, a 3 px gold focus ring with offset, hover and active feedback, and a distinct disabled state. Selected cosmetics include a strong border and `✓ SELECTED`; toggles expose visible ON/OFF text and `aria-pressed`; Director changes use `↑ Increase`, `↓ Decrease`, and `= Unchanged` so color is never the only signal.
