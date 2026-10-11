import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { MarketingLayout } from '@/components/layout/MarketingLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { RequireAdmin, RequireAuth } from '@/components/auth/guards'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/auth/AuthContext'
import { ThemeProvider } from '@/lib/theme'
import { Landing } from '@/routes/Landing'
import { Login } from '@/routes/Login'
import { Signup } from '@/routes/Signup'
import { Dashboard } from '@/routes/Dashboard'
import { LinkDetail } from '@/routes/LinkDetail'
import { Profile } from '@/routes/Profile'
import { ApiKeys } from '@/routes/ApiKeys'
import { AdminUsers } from '@/routes/AdminUsers'
import { AdminLinks } from '@/routes/AdminLinks'
import { NotFound } from '@/routes/NotFound'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public marketing */}
                <Route element={<MarketingLayout />}>
                  <Route index element={<Landing />} />
                </Route>

                {/* Auth pages */}
                <Route element={<AuthLayout />}>
                  <Route path="login" element={<Login />} />
                  <Route path="signup" element={<Signup />} />
                </Route>

                {/* Authenticated app */}
                <Route element={<AppLayout />}>
                  <Route
                    path="dashboard"
                    element={
                      <RequireAuth>
                        <Dashboard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="links/:shortCode"
                    element={
                      <RequireAuth>
                        <LinkDetail />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="profile"
                    element={
                      <RequireAuth>
                        <Profile />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="api-keys"
                    element={
                      <RequireAuth>
                        <ApiKeys />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="admin/users"
                    element={
                      <RequireAdmin>
                        <AdminUsers />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="admin/links"
                    element={
                      <RequireAdmin>
                        <AdminLinks />
                      </RequireAdmin>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
