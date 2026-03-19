# UI Components

This directory contains reusable UI components for the GbgGridlock dashboard.

## AccentedButton

A modern button component with customizable bottom accent line, designed for transit line selection and mode filtering.

### Usage

```tsx
import { AccentedButton } from '@/components/ui/accented-button'

// Basic usage
<AccentedButton accentColor="#3B82F6">
  Click me
</AccentedButton>

// With transit line color
<AccentedButton 
  accentColor={lineStyle.backgroundColor}
  variant="outline"
  size="sm"
>
  <TramFront className="h-4 w-4" />
  <span>Line 5</span>
</AccentedButton>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `accentColor` | `string` | `'var(--primary)'` | Color for the bottom accent line |
| `variant` | `'default' \| 'outline' \| 'ghost'` | `'default'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `children` | `ReactNode` | - | Button content |
| `...props` | `ButtonHTMLAttributes` | - | Standard button attributes |

### Variants

- **default**: Solid background with border, ideal for selected states
- **outline**: Transparent background with border, ideal for unselected states
- **ghost**: No background or border, ideal for subtle actions

### Features

- Always-visible bottom accent line (3px height, expands to 4px on hover)
- Smooth transitions (200ms)
- Keyboard accessible with visible focus states
- Active scale feedback (scale-95)
- Respects `prefers-reduced-motion`
- Fully responsive

### Examples

See `/button-demo` route for live examples and use cases.

## Card

Standard card component with header, content, and footer sections.

### Usage

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```
