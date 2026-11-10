import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { Button, ErrorBox, Spinner } from './components/ui'
import { NutriLayout, PatientLayout } from './layouts/Layouts'
import { LoginPage, SetPasswordPage } from './pages/auth/AuthPages'

// Cada área vira um chunk separado: o celular do paciente não baixa as telas da nutricionista.
const TodayPage = lazy(() => import('./pages/nutri/TodayPage').then((m) => ({ default: m.TodayPage })))
const PatientsPage = lazy(() => import('./pages/nutri/PatientsPage').then((m) => ({ default: m.PatientsPage })))
const PatientDetailPage = lazy(() => import('./pages/nutri/PatientDetailPage').then((m) => ({ default: m.PatientDetailPage })))
const patientPages = () => import('./pages/patient/PatientPages')
const PatientHome = lazy(() => patientPages().then((m) => ({ default: m.PatientHome })))
const PatientPlan = lazy(() => patientPages().then((m) => ({ default: m.PatientPlan })))
const SwapScale = lazy(() => patientPages().then((m) => ({ default: m.SwapScale })))
const CheckInPage = lazy(() => patientPages().then((m) => ({ default: m.CheckInPage })))
const PatientProgress = lazy(() => patientPages().then((m) => ({ default: m.PatientProgress })))

export default function App() {
  const { ready, session, me, meError, meLoading, needsPassword, signOut } = useAuth()

  if (!ready || meLoading) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>

  if (!session) {
    return (
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/definir-senha" element={<SetPasswordPage />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    )
  }

  if (needsPassword) {
    return (
      <Routes>
        <Route path="*" element={<SetPasswordPage />} />
      </Routes>
    )
  }

  if (meError || !me) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
        <ErrorBox error={meError ?? 'Conta não encontrada.'} />
        <Button variant="outline" onClick={signOut}>Sair</Button>
      </div>
    )
  }

  if (me.role === 'nutritionist') {
    return (
      <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<NutriLayout />}>
          <Route index element={<TodayPage />} />
          <Route path="pacientes" element={<PatientsPage />} />
          <Route path="pacientes/:id" element={<PatientDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<Spinner />}>
    <Routes>
      <Route element={<PatientLayout />}>
        <Route index element={<PatientHome />} />
        <Route path="plano" element={<PatientPlan />} />
        <Route path="trocas" element={<SwapScale />} />
        <Route path="check-in" element={<CheckInPage />} />
        <Route path="evolucao" element={<PatientProgress />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}
