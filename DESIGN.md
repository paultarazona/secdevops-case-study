---
name: SecDevOps Lab
description: A guided local lab for comparing vulnerable and hardened web application behavior.
colors:
  ink: "#162028"
  muted: "#40505b"
  surface: "#ffffff"
  canvas: "#eef2f2"
  primary: "#075b63"
  primary-strong: "#053f45"
  safe: "#176a48"
  warning: "#8a4b00"
  danger: "#9a2d2d"
  line: "#aab8bc"
typography:
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.08em"
rounded:
  control: "6px"
  surface: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
---

# Design System: SecDevOps Lab

## Overview

**Creative North Star: "The Guided Security Workbook"**

This is a focused product interface for learners working through concrete security behavior. It uses calm surfaces, clear hierarchy, and evidence-led status so that the lesson remains more prominent than the interface. V1 and V2 are distinct by purpose and semantic state, not by gimmicks.

**Key Characteristics:**
- A persistent lesson catalog makes the learning route visible.
- Lesson pages move from objective to controlled action to evidence to remediation.
- The functional resource workspace stays available as the lab substrate.
- Responsive structure collapses navigation before compressing content.

## Colors

The palette is restrained: teal directs primary actions and selection; semantic green, amber, and red explain result states without becoming decorative.

### Primary
- **Lab Teal**: used for navigation selection, primary actions, and focused learning context.

### Secondary
- **Verification Green**: used only for confirmed secure behavior and completed verification.
- **Evidence Amber**: used for local-only warnings and incomplete verification.
- **Vulnerable Red**: used for the explicit V1 risk label and destructive actions.

### Neutral
- **Cool Canvas**: supports long reading sessions without warm paper styling.
- **Structured Ink**: maintains accessible reading contrast for content and controls.

**The Semantic State Rule.** Red, amber, and green always include text and an icon or label; color alone never communicates challenge state.

## Typography

**Display Font:** System UI sans-serif
**Body Font:** System UI sans-serif
**Label/Mono Font:** ui-monospace, SFMono-Regular, Menlo, Consolas, monospace

**Character:** Familiar product typography keeps tasks readable and avoids a theatrical security aesthetic.

### Hierarchy
- **Title**: used for page and lesson names; compact and high contrast.
- **Body**: used for instructions and explanations; keep prose within 72ch.
- **Label**: mono, uppercase labels identify lesson metadata and evidence without becoming decoration.

## Elevation

Surfaces use subtle borders and a low structural shadow. Depth communicates navigation and grouping, never visual spectacle.

### Shadow Vocabulary
- **Surface Lift** (`0 2px 10px rgba(22, 32, 40, 0.08)`): used for the application shell and focused lesson panels.

**The Quiet Surface Rule.** Nested cards are forbidden; one surface layer is enough for each decision area.

## Components

### Buttons
- **Shape:** gently rounded controls (6px).
- **Primary:** teal background with white text; reserved for the next meaningful learner action.
- **Hover / Focus:** a 180ms color transition and high-contrast visible focus ring.
- **Secondary:** bordered neutral action for refresh, reset, and navigation.

### Chips
- **Style:** compact metadata labels with text and an accompanying state symbol.
- **State:** V1 risk, V2 protection, lesson difficulty, and verification status only.

### Cards / Containers
- **Corner Style:** restrained surface corners (10px).
- **Background:** white over the cool canvas.
- **Shadow Strategy:** use Surface Lift only for top-level panels.
- **Border:** one-pixel structured line.
- **Internal Padding:** 16px to 24px depending on content density.

### Inputs / Fields
- **Style:** white background and visible neutral border.
- **Focus:** teal outline with a 3px offset; never remove the browser focus cue without replacing it.
- **Error / Disabled:** include explanatory text; do not rely on tint alone.

### Navigation
- **Style:** a catalog sidebar on desktop and a compact disclosure on small screens. Current lesson state is indicated with label, icon, and teal selection treatment.

## Do's and Don'ts

### Do:
- **Do** present every lesson as objective, action, evidence, and mitigation.
- **Do** keep interactive targets at least 24px and maintain keyboard focus visibly.
- **Do** label V1 as local-only and unsafe, and V2 as the hardened comparison.
- **Do** use direct, instructional copy for errors and empty states.

### Don't:
- **Don't** add points, badges, streaks, or artificial urgency.
- **Don't** use neon terminal aesthetics, dark gradients, glassmorphism, or hacker-film decoration.
- **Don't** use a colored side stripe wider than 1px as a card accent.
- **Don't** mark a lesson complete merely because a learner opened it.
