---
name: Startup Automation Scout
description: Evidence-first startup research for automation opportunities.
colors:
  ink: "#162033"
  ink-soft: "#4b5668"
  ink-faint: "#788294"
  paper: "#f7f8f4"
  paper-deep: "#e9edf0"
  paper-warm: "#f0f1eb"
  rail: "#101827"
  rail-soft: "#18243a"
  line: "#cbd1d7"
  line-dark: "#2e3a50"
  cobalt: "#356bd3"
  cobalt-dark: "#20489a"
  citron: "#d9ef4e"
  coral: "#cc6352"
  amber: "#b4781c"
  green: "#2b795b"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Fira Sans, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(30px, 4vw, 52px)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Fira Sans, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(27px, 4vw, 47px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.05em"
  title:
    fontFamily: "Fira Sans, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Fira Sans, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Fira Code, SFMono-Regular, Consolas, monospace"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  small: "7px"
  default: "12px"
  pill: "999px"
  epistemic: "3px"
spacing:
  xs: "7px"
  sm: "9px"
  md: "16px"
  lg: "24px"
  xl: "42px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.white}"
    typography: "{typography.title}"
    rounded: "{rounded.small}"
    padding: "0 16px"
    height: "42px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.small}"
    padding: "0 16px"
    height: "42px"
  text-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.small}"
    padding: "9px 11px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "21px"
  active-navigation:
    backgroundColor: "{colors.rail-soft}"
    textColor: "{colors.citron}"
    typography: "{typography.body}"
    rounded: "0"
    padding: "0 11px"
    height: "42px"
---

# Design System: Startup Automation Scout

## Overview

**Creative North Star: "The Evidence Ledger"**

Startup Automation Scout should feel like a research workbench that happens to
be a web application. Its visual language turns provenance into a visible
working surface: claims sit beside their sources, pipeline state reads like a
ledger, and the owner can see where judgment enters the system. It is calm,
precise and operational rather than promotional.

The dark rail gives the workbench a stable frame. Paper-white research panels,
thin rules and small mono labels create a measured editorial texture. Cobalt
marks actions and evidence links. Citron is scarce and reserved for active
state. The system is flat by default, with depth coming from tonal contrast,
spacing and borders rather than decorative effects.

**Key Characteristics:**

- Evidence is adjacent to the claim it supports.
- Measurement labels use a compact mono voice.
- Rules and spacing create hierarchy before ornament.
- One bright active marker gives the interface a pulse.

## Colors

The palette is a graphite and paper field with a restrained cobalt action color,
a citron state marker and warm status accents for uncertainty or failure.

### Primary

- **Working Cobalt** (#356bd3): Primary actions, evidence links, focus rings
  and progress marks.
- **Deep Cobalt** (#20489a): Hover states and high-contrast text links on
  paper.
- **Citron Signal** (#d9ef4e): Active navigation, live status and the selected
  state on the dark rail. Use it sparingly.

### Secondary

- **Research Green** (#2b795b): Successful runs, verified claims and safe
  local-state indicators.
- **Caution Amber** (#b4781c): Unknowns, warnings and validation-needed states.
- **Soft Coral** (#cc6352): Terminal failure and destructive run controls.

### Neutral

- **Ink Navy** (#162033): Primary text, strong rules and structural contrast.
- **Soft Ink** (#4b5668): Supporting copy and secondary values.
- **Faint Ink** (#788294): Metadata, labels and quiet guidance.
- **Paper** (#f7f8f4): Main research surface.
- **Deep Paper** (#e9edf0): Page background and outer frame.
- **Warm Paper** (#f0f1eb): Forms and contextual callouts.
- **Graphite Rail** (#101827): Navigation frame and dark scoring surfaces.
- **Rail Soft** (#18243a): Active navigation surface.
- **Rule** (#cbd1d7): Dividers and quiet borders.
- **Dark Rule** (#2e3a50): Dividers on the navigation frame.
- **White** (#ffffff): Inputs, quiet buttons and reading surfaces.

**The Scarcity Rule.** Citron is a signal, not a decoration. Reserve it for
active state, live state and selected controls.

## Typography

**Display Font:** Fira Sans (with Inter and system sans fallbacks)

**Body Font:** Fira Sans (with Inter and system sans fallbacks)

**Label/Mono Font:** Fira Code (with SFMono-Regular and Consolas fallbacks)

**Character:** Fira Sans keeps research prose direct and legible. Fira Code
turns timestamps, stages, scores and labels into instrument readouts without
making the entire interface feel like a terminal.

### Hierarchy

- **Display** (600, `clamp(30px, 4vw, 52px)`, 1.02): Page titles and the main
  control-room statement.
- **Headline** (600, `clamp(27px, 4vw, 47px)`, 1.05): Company and opportunity
  detail titles.
- **Title** (600, 16px, 1.3): Panel headings and important row labels.
- **Body** (400, 15px, 1.5): Research copy, descriptions and explanations.
  Keep long reading blocks near 65 to 70 characters when possible.
- **Label** (500, 10px, 1.2, `0.06em`): Stages, metadata, status context and
  uppercase measurement labels.

**The Two-Voice Rule.** Use Fira Sans for meaning and Fira Code for state,
measurement and provenance. Do not turn ordinary explanatory copy into a
technical label.

## Layout

The desktop frame is a 248px navigation rail beside a fluid main column. The
top bar is 62px tall. Content sits in a centered container capped at 1440px,
with 42px horizontal and 45px top padding on large screens. Main work areas use
two columns, with the reading surface larger than the evidence or control
aside. Detail pages use the same relationship.

The spacing rhythm is built from small 7 to 9px gaps, 16px internal units,
24px work-area gaps and 42px page gutters. Tables and pipeline steps use rules
instead of boxed cards. On narrower screens, the rail becomes a horizontal
navigation strip, two-column workspaces stack, and wide ledgers scroll inside
their own region. At 470px, panel padding reduces to 15px.

## Elevation & Depth

Surfaces are flat at rest. Hierarchy comes from the paper, deep-paper and rail
tones, top rules, bottom rules and deliberate whitespace. Inputs and source
citations use a white reading surface within paper panels. The active pipeline
step is the only regular dark surface inside the main work area. Avoid shadows
as a default container treatment.

**The Flat Ledger Rule.** A new surface must earn its boundary through a
functional reading or state transition. Do not add a floating card merely to
hold a metric.

## Shapes

The form language is lightly rounded at interactive edges and square at
structural boundaries. Buttons, fields and source citations use a restrained
7px radius. Status badges are pill-shaped. Epistemic labels use a compact 3px
radius so they read like tags in a record. Panels and ruled rows remain square.
Focus uses a visible cobalt outline with a 3px offset. Borders are thin and
quiet on paper, stronger on the rail.

## Components

### Buttons

- **Shape:** Lightly rounded interactive edges (7px).
- **Primary:** Working Cobalt background, white text, 42px height and 16px
  horizontal padding.
- **Hover / Focus:** Deep Cobalt on hover. All variants use a 3px cobalt
  focus outline and never hide focus behind color alone.
- **Secondary / Quiet / Danger:** Secondary is ink outlined and becomes ink
  filled on hover. Quiet stays white with a quiet rule. Danger uses Soft Coral
  only for an explicit destructive run action.

### Chips

- **Style:** Status badges are outlined pills with a mono label. Epistemic
  labels are compact rectangular tags with a tinted background.
- **State:** Verified is green, Inferred is cobalt, Estimated is amber and
  Unknown is faint neutral. The written label remains present in every state.

### Cards / Containers

- **Corner Style:** Structural panels are square. Nested interactive source
  citations use a 7px radius.
- **Background:** Paper for research, Warm Paper for forms and callouts, Rail
  for dark score or active pipeline surfaces.
- **Shadow Strategy:** Flat by default. Use tonal contrast and rules instead
  of a drop shadow.
- **Border:** One-pixel rules, with an ink rule for a section's opening edge.
- **Internal Padding:** 21px for standard panels, 17px for compact records,
  15px on the smallest viewport.

### Inputs / Fields

- **Style:** White background, one-pixel muted border, 7px radius, readable
  body text and 9px to 11px internal padding.
- **Focus:** Cobalt border plus a visible three-pixel outline ring.
- **Error / Disabled:** Preserve the text error, reduce opacity only for
  disabled controls and never rely on a red border alone.

### Navigation

- **Style:** Navy rail with Fira Code labels and Fira Sans link text.
- **Default / Hover / Active:** Quiet gray default, a stronger rule on hover,
  and a Rail Soft active surface with a two-pixel citron index mark.
- **Mobile treatment:** The rail becomes a short top strip with horizontally
  scrollable links. The active index mark moves to the bottom edge.

### Evidence Ledger

Evidence lines use a cobalt-outlined marker, a vertical connector and an
adjacent source citation. This is the signature component. It makes the chain
from claim to source readable without sending the user to a separate
bibliography.

## Do's and Don'ts

### Do:

- **Do** put a source citation beside the claim, signal or score rationale it
  supports.
- **Do** keep Verified, Inferred, Estimated and Unknown labels explicit.
- **Do** use ruled lists, compact mono metadata and a clear reading column.
- **Do** preserve a visible focus ring and readable labels at every breakpoint.
- **Do** use cobalt for action and evidence, citron for active state, and warm
  accents only for meaningful status.

### Don't:

- **Don't** turn every metric or paragraph into a rounded floating card.
- **Don't** use gradients, glassmorphism, decorative illustration or emoji as
  the primary visual language.
- **Don't** hide provenance in a bibliography detached from the claim.
- **Don't** communicate epistemic state through color without the written
  label.
- **Don't** use a hero layout or promotional language where a research ledger
  is needed.
