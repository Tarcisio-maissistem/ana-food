"use client"

import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { MainDashboard } from "./main-dashboard"
import { useState, useEffect } from "react"

interface DevUser {
  id: string
  email: string
  name: string
  company_name?: string
}

function AppContent() {
  const { user, loading } = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  const [devUser, setDevUser] = useState<DevUser | null>(null)
  const [loadingDevUser, setLoadingDevUser] = useState(true)

  useEffect(() => {
    const loadDevUser = async () => {
      try {
        console.log("[v0] Carregando usuário de desenvolvimento...")
        const response = await fetch("/api/auth/get-user-by-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "tarcisiorp16@gmail.com" }),
        })

        if (response.ok) {
          const userData = await response.json()
          console.log("[v0] Usuário de desenvolvimento carregado:", userData.id)
          setDevUser(userData)

          // Definir contexto global para APIs
          window.devUserId = userData.id
        } else {
          console.log("[v0] Usuário não encontrado, usando contexto padrão")
        }
      } catch (error) {
        console.error("[v0] Erro ao carregar usuário:", error)
      } finally {
        setLoadingDevUser(false)
      }
    }

    loadDevUser()
  }, [])

  if (loadingDevUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando contexto do usuário...</p>
        </div>
      </div>
    )
  }

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
