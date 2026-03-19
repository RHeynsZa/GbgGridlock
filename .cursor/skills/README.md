# UI/UX Pro Max Skill

This directory contains the UI/UX Pro Max skill for intelligent design system generation.

## What is this?

UI/UX Pro Max is an AI skill that provides design intelligence for building professional UI/UX. It automatically activates when you request UI/UX work in Cursor or other AI assistants.

## Features

- **67 UI Styles** - Glassmorphism, Minimalism, Dark Mode, Bento Grid, and more
- **161 Industry-Specific Rules** - Tailored design systems for dashboards, SaaS, fintech, healthcare, etc.
- **57 Font Pairings** - Curated typography combinations
- **25 Chart Types** - Data visualization recommendations
- **99 UX Guidelines** - Best practices and accessibility rules

## How to Use

### Auto-Activation (Recommended)

The skill activates automatically when you request UI/UX work. Just ask naturally:

```
Build a landing page for the transit dashboard
Create a new chart component for delay visualization
Design a mobile-friendly navigation menu
Improve the accessibility of the dashboard
```

### Manual Design System Generation

Generate a complete design system for GbgGridlock:

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "transit analytics dashboard" --design-system -p "GbgGridlock"
```

Generate and persist to files:

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "transit dashboard" --design-system --persist -p "GbgGridlock"
```

### Domain-Specific Searches

```bash
# Search for styles
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "dark mode" --domain style

# Search for typography
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "modern sans-serif" --domain typography

# Search for charts
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "time series" --domain chart
```

### Stack-Specific Guidelines

Get recommendations for the GbgGridlock tech stack:

```bash
# React + shadcn/ui guidelines
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "form validation" --stack react
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "responsive layout" --stack shadcn
```

## GbgGridlock Design System

The skill has generated a tailored design system for GbgGridlock:

- **Pattern:** Minimal & Direct + Demo
- **Style:** Flat Design (optimized for dashboards and analytics)
- **Colors:** Indigo primary (#6366F1) + Emerald CTA (#10B981)
- **Typography:** Fira Code (headings) / Fira Sans (body)
- **Mood:** Dashboard, data, analytics, technical, precise
- **Performance:** Excellent
- **Accessibility:** WCAG AAA compliant

## Pre-Delivery Checklist

Every UI component should meet these criteria:

- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Text contrast 4.5:1 minimum for light mode
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive breakpoints: 375px, 768px, 1024px, 1440px

## Tech Stack Support

This skill provides specific guidelines for our stack:

- **React** - Component patterns, hooks, performance
- **TypeScript** - Type-safe UI components
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Accessible component library
- **Recharts** - Data visualization

## Learn More

- Official Site: [https://uupm.cc](https://uupm.cc)
- GitHub: [https://github.com/nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- CLI: `npm install -g uipro-cli`

## Updates

To update the skill to the latest version:

```bash
cd /workspace
uipro update
```

## Support

If you encounter issues with the skill:

1. Ensure Python 3.x is installed: `python3 --version`
2. Check the skill files are present: `ls .cursor/skills/ui-ux-pro-max/`
3. Test the search script: `python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "test"`
4. Report issues: [GitHub Issues](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/issues)
