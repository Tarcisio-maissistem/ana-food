"use client"

import type React from "react"

import { AuthProvider } from "@/contexts/auth-context"
import { MainDashboard } from "./main-dashboard"
import { useState, useEffect, createContext, useContext } from "react"

interface DevUserContextType {
  user: {
    id: string
    email: string
    name: string
  } | null
  loading: boolean
}

const DevUserContext = createContext<DevUserContextType>({
  user: null,
  loading: true,
})

export const useDevUser = () => useContext(DevUserContext)

function DevUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/get-user-by-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "tarcisiorp16@gmail.com" }),
        })

        if (response.ok) {
          const userData = await response.json()
          setUser({
            id: userData.id,
            email: userData.email,
            name: userData.name || userData.nomeCompleto || "Usuário",
          })
          console.log("[v0] Usuário carregado para desenvolvimento:", userData.id)
        } else {
          console.log("[v0] Usuário não encontrado, usando contexto padrão")
          setUser({
            id: "dev-user",
            email: "tarcisiorp16@gmail.com",
            name: "Usuário de Desenvolvimento",
          })
        }
      } catch (error) {
        console.error("[v0] Erro ao carregar usuário:", error)
        setUser({
          id: "dev-user",
          email: "tarcisiorp16@gmail.com",
          name: "Usuário de Desenvolvimento",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return <DevUserContext.Provider value={{ user, loading }}>{children}</DevUserContext.Provider>
}

function AppContent() {
  const { user, loading } = useDevUser()
  const [showRegister, setShowRegister] = useState(false)

  console.log("[v0] AppContent: Loading:", loading, "User:", user)

  if (loading) {
    console.log("[v0] AppContent: Mostrando tela de loading")
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando usuário...</p>
        </div>
      </div>
    )
  }

  console.log("[v0] AppContent: Renderizando MainDashboard")
  return <MainDashboard user={user} />

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
      <DevUserProvider>
        <AppContent />
      </DevUserProvider>
    </AuthProvider>
  )
}
