#!/usr/bin/env node
// One command to see the whole frontend:
//   - starts the standalone mock API (default :8081)
//   - waits for it to be healthy
//   - starts the Vite dev server (:5173) pointed at the mock
//
// Usage: npm run demo          (from frontend/ or the repo root)
//        MOCK_PORT=9000 npm run demo
//        DEMO_NO_OPEN=1 npm run demo   (do not auto-open the browser)
import { spawn } from 'node:child_process'
import process from 'node:process'

const isWindows = process.platform === 'win32'
const mockPort = process.env.MOCK_PORT ?? '8081'
const apiBase = `http://localhost:${mockPort}`
const shouldOpen = process.env.DEMO_NO_OPEN !== '1'

const children = []
let shuttingDown = false

function spawnChild(commandString, env) {
  const child = spawn(commandString, { stdio: 'inherit', shell: true, env })
  children.push(child)
  return child
}

function killTree(child) {
  if (!child || child.exitCode !== null) return
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
  } else {
    try {
      child.kill('SIGTERM')
    } catch {
      /* ignore */
    }
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) killTree(child)
  setTimeout(() => process.exit(code), 400)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

async function waitForHealth(url, timeoutMs = 40000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  return false
}

console.log('\n🚀  PathIO demo — starting mock API + frontend\n')

const mock = spawnChild('npm run mock', { ...process.env, MOCK_PORT: mockPort })
mock.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`\nMock server exited unexpectedly (code ${code ?? '?'}).`)
    shutdown(code ?? 1)
  }
})

const healthy = await waitForHealth(`${apiBase}/actuator/health`)

if (!healthy) {
  console.error(`\n✖  Mock API did not become healthy at ${apiBase}/actuator/health`)
  shutdown(1)
} else {
  console.log(`\n✓  Mock API ready at ${apiBase}`)
  console.log('   Admin login : admin@pathio.local / admin12345')
  console.log('   OAuth user  : alice@example.com (Google button)')
  console.log('   Frontend    : http://localhost:5173\n')

  const viteCommand = shouldOpen ? 'npm run dev -- --open' : 'npm run dev'

  const vite = spawnChild(viteCommand, {
    ...process.env,
    VITE_API_BASE_URL: apiBase,
    VITE_USE_MOCKS: 'false',
  })
  vite.on('exit', (code) => {
    if (!shuttingDown) shutdown(code ?? 0)
  })
}
