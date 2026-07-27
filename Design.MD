---
name: Pitch Pulse
colors:
  surface: '#091421'
  surface-dim: '#091421'
  surface-bright: '#303a48'
  surface-container-lowest: '#050f1c'
  surface-container-low: '#121c2a'
  surface-container: '#16202e'
  surface-container-high: '#212b39'
  surface-container-highest: '#2b3544'
  on-surface: '#d9e3f6'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#d9e3f6'
  inverse-on-surface: '#27313f'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#cebdff'
  on-secondary: '#381385'
  secondary-container: '#4f319c'
  on-secondary-container: '#bea8ff'
  tertiary: '#efc200'
  on-tertiary: '#3c2f00'
  tertiary-container: '#cea700'
  on-tertiary-container: '#4e3e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#e8ddff'
  secondary-fixed-dim: '#cebdff'
  on-secondary-fixed: '#21005e'
  on-secondary-fixed-variant: '#4f319c'
  tertiary-fixed: '#ffe083'
  tertiary-fixed-dim: '#eec200'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#574500'
  background: '#091421'
  on-background: '#d9e3f6'
  surface-variant: '#2b3544'
typography:
  display-lg:
    fontFamily: Anybody
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Anybody
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Anybody
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Anybody
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for the high-intensity, fast-paced world of Futsal and Society football. The brand personality is **energetic, competitive, and precise**, capturing the adrenaline of the match and the analytical depth of post-game stats.

The design style leverages **Modern High-Contrast** aesthetics with a touch of **Digital Brutalism**. It prioritizes readability under various lighting conditions (including outdoor night games) and emphasizes a "player-first" experience. The visual language uses heavy weights, sharp verticality, and aggressive color accents to evoke the atmosphere of a professional sports broadcast.

The emotional response should be one of **momentum and motivation**, encouraging players to track their progress, show up for matches, and engage with their team's rankings.

## Colors

The palette is built around a "Night Match" aesthetic, with the dark theme as the primary intended experience to reduce glare during evening games.

- **Primary Purple (#7C3AED):** Used for primary actions, active states, and brand-defining headers.
- **Secondary Purple (#A78BFA):** Used for accents, secondary buttons, and data visualization highlights.
- **Tertiary Gold (#FACC15):** Introduced as a "MVP" color for rankings, trophies, and high-performance indicators.
- **Functional Colors:** Success (Emerald 500), Danger (Rose 500), and Warning (Amber 500) are used for match results and attendance status.

In Light Mode, surfaces utilize subtle grays to maintain a clean, organized feel. In Dark Mode, deep navy-blacks provide high contrast for the vibrant purple accents.

## Typography

The typography system uses three distinct typefaces to balance energy with utility:

1.  **Display & Headings (Anybody):** A variable font with an industrial, athletic feel. Used for scores, player names, and section titles. High weights (700+) are preferred for a "breaking news" sports aesthetic.
2.  **Body (Hanken Grotesk):** A modern, sharp neo-grotesque that ensures high legibility for news feeds, player bios, and game descriptions.
3.  **Data & Labels (JetBrains Mono):** A monospaced font used for "technical" data: clock times, match coordinates, jersey numbers, and tactical stats. This adds a precise, "engineered" feel to the pitch metrics.

**Scalability:** On mobile, display sizes are reduced, but weight is maintained to keep the visual impact.

## Layout & Spacing

The layout follows a **8px grid system** to ensure mathematical consistency. 

- **Fluid Grid:** Content primarily uses a fluid 4-column grid on mobile and a 12-column grid on desktop.
- **Pitch Visualization:** The digital pitch should maintain a fixed aspect ratio (approx. 2:3) regardless of screen width, scaling to fit the container while maintaining tactical accuracy.
- **Information Density:** For ranking tables and player stats, spacing is tightened (`stack-sm`) to allow for maximum data visibility without scrolling.
- **Safe Areas:** Generous bottom padding is applied to accommodate "Quick Action" floating buttons for scoring or substitutions.

## Elevation & Depth

This system uses **Tonal Layering** and **High-Contrast Outlines** rather than soft shadows to maintain a sporty, aggressive look.

1.  **Base:** Background color.
2.  **Surface:** Surface Gray (Light or Dark).
3.  **Raised:** Elements like Player Cards use a 1px solid border (#7C3AED at 20% opacity) rather than a shadow.
4.  **Overlays:** Modals and Pitch Tactical Overlays use a backdrop blur (12px) with a semi-transparent version of the background color to maintain context of the game.

Interactive elements (buttons) utilize a "Hard Shadow" (2px 2px 0px Black) in Light Mode to simulate a tactile, sticker-like feel common in sports branding.

## Shapes

The shape language is **Soft (0.25rem)**, moving away from "bubbly" interfaces toward a more structured, athletic appearance.

- **Buttons & Cards:** Use a standard `rounded-md` (4px) to look sturdy.
- **Status Chips:** Use a `rounded-full` (pill) shape to differentiate status indicators from interactive buttons.
- **Pitch Markings:** Lines on the digital pitch visualization should be crisp 2px paths with minimal rounding.
- **Avatars:** Player photos should be contained in hexagonal frames or standard squares with minimal rounding to evoke team crests.

## Components

- **Player Stat Cards:** Feature the `display-lg` font for primary metrics (Goals, Assists). Use a vertical progress bar for "Energy" or "Form" levels.
- **Game Attendance List:** Uses a split layout—left side for player avatar/name, right side for a toggle switch (Going/Not Going). Use success/danger colors for the toggle states.
- **Ranking Tables:** Clean, row-based layout. The "Position" column uses `label-bold` with `secondary_color` backgrounds for the Top 3 players.
- **Digital Pitch:** A green-tinted dark surface (`#064E3B` in Dark Mode) with `not-quite-white` lines. Players are represented by 40px circles featuring jersey numbers in `jetbrainsMono`.
- **Primary Buttons:** High-contrast `primary_color` background with white `label-bold` text. On hover/active, apply a 2px offset "brutalism" shadow.
- **Match Scoreboard:** A specialized component using `display-lg` for the score, centered between two team crests, housed in a `surface_dark` container with a `secondary_color` top-border.