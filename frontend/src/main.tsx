import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { USE_MOCKS } from '@/lib/config'
import '@/index.css'

async function enableMocking(): Promise<void> {
  if (!USE_MOCKS) return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

void enableMocking().then(() => {
  const container = document.getElementById('root')
  if (!container) throw new Error('Root element #root not found')
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
