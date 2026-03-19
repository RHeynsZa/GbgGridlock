import { createFileRoute } from '@tanstack/react-router'

import { ButtonDemoPage } from '@/features/button-demo/button-demo-page'

export const Route = createFileRoute('/button-demo')({
  component: ButtonDemoPage,
})
