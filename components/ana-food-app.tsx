"use client"

import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { MainDashboard } from "./main-dashboard"
import { useState } from "react"

function AppContent() {
  const { user, loading } = useAuth()
  const [showRegister, setShowRegister] = useState(false)

  return <MainDashboard />

  /* CÓDIGO DE AUTENTICAÇÃO DESABILITADO TEMPORARIAMENTE
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    if (showRegister) {
      return (
        <RegisterScreen onBackToLogin={() => setShowRegister(false)} onRegisterSuccess={() => setShowRegister(false)} />
      )
    }
    return <LoginScreen onLogin={() => {}} onShowRegister={() => setShowRegister(true)} />
  }

  return <MainDashboard />
  */
}

export function AnaFoodApp() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
