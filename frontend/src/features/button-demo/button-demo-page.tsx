import { BusFront, Ship, TramFront } from 'lucide-react'

import { AccentedButton } from '@/components/ui/accented-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const demoLineColors = [
  { line: '5', color: '#56B4E9', name: 'Tram 5' },
  { line: '6', color: '#009E73', name: 'Tram 6' },
  { line: '11', color: '#F0E442', name: 'Tram 11' },
  { line: '16', color: '#0072B2', name: 'Bus 16' },
  { line: '19', color: '#D55E00', name: 'Bus 19' },
  { line: 'X4', color: '#CC79A7', name: 'Express X4' },
]

export function ButtonDemoPage() {
  return (
    <main className="min-h-screen w-full bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AccentedButton Component Demo</h1>
          <p className="text-muted-foreground mt-2">
            A modern button component with customizable accent colors, perfect for line-based navigation
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transit Line Buttons</CardTitle>
            <CardDescription>Buttons accented with official line colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Default Variant</h3>
              <div className="flex flex-wrap gap-2">
                {demoLineColors.map((line) => (
                  <AccentedButton key={line.line} accentColor={line.color} variant="default" size="md">
                    <TramFront className="h-4 w-4" />
                    <span>{line.line}</span>
                  </AccentedButton>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">Outline Variant</h3>
              <div className="flex flex-wrap gap-2">
                {demoLineColors.map((line) => (
                  <AccentedButton key={line.line} accentColor={line.color} variant="outline" size="md">
                    <BusFront className="h-4 w-4" />
                    <span>{line.line}</span>
                  </AccentedButton>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">Ghost Variant</h3>
              <div className="flex flex-wrap gap-2">
                {demoLineColors.map((line) => (
                  <AccentedButton key={line.line} accentColor={line.color} variant="ghost" size="md">
                    <Ship className="h-4 w-4" />
                    <span>{line.line}</span>
                  </AccentedButton>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Size Variations</CardTitle>
            <CardDescription>Small, medium, and large button sizes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <AccentedButton accentColor="#3B82F6" variant="default" size="sm">
                Small
              </AccentedButton>
              <AccentedButton accentColor="#3B82F6" variant="default" size="md">
                Medium
              </AccentedButton>
              <AccentedButton accentColor="#3B82F6" variant="default" size="lg">
                Large
              </AccentedButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interactive States</CardTitle>
            <CardDescription>Hover, focus, and disabled states</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <AccentedButton accentColor="#10B981" variant="default">
                Hover me
              </AccentedButton>
              <AccentedButton accentColor="#F59E0B" variant="outline">
                Focus me (Tab)
              </AccentedButton>
              <AccentedButton accentColor="#EF4444" variant="default" disabled>
                Disabled
              </AccentedButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Use Cases</CardTitle>
            <CardDescription>Common usage patterns in the GbgGridlock dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Transport Mode Filter</h3>
              <div className="flex flex-col gap-2 sm:flex-row">
                <AccentedButton accentColor="var(--primary)" variant="default" className="flex-1 justify-center">
                  <TramFront className="h-4 w-4" />
                  Tram
                </AccentedButton>
                <AccentedButton accentColor="var(--primary)" variant="outline" className="flex-1 justify-center">
                  <BusFront className="h-4 w-4" />
                  Bus
                </AccentedButton>
                <AccentedButton accentColor="var(--primary)" variant="outline" className="flex-1 justify-center">
                  <Ship className="h-4 w-4" />
                  Ferry
                </AccentedButton>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Line Selection</h3>
              <div className="flex flex-wrap gap-2">
                <AccentedButton accentColor="#56B4E9" variant="default" size="sm">
                  <TramFront className="h-4 w-4" />5
                </AccentedButton>
                <AccentedButton accentColor="#009E73" variant="outline" size="sm">
                  <TramFront className="h-4 w-4" />6
                </AccentedButton>
                <AccentedButton accentColor="#F0E442" variant="outline" size="sm">
                  <TramFront className="h-4 w-4" />
                  11
                </AccentedButton>
                <AccentedButton accentColor="#0072B2" variant="outline" size="sm">
                  <BusFront className="h-4 w-4" />
                  16
                </AccentedButton>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Design Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Always-visible bottom accent line that matches the line color</li>
              <li>✓ Smooth hover effect that slightly increases the accent height</li>
              <li>✓ Three variants: default, outline, and ghost</li>
              <li>✓ Three sizes: small, medium, and large</li>
              <li>✓ Full keyboard accessibility with visible focus states</li>
              <li>✓ Respects prefers-reduced-motion for accessibility</li>
              <li>✓ Active scale feedback for better interaction feel</li>
              <li>✓ Modern flat design following the GbgGridlock design system</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
