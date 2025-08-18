"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { AuthUser } from "@/lib/auth"

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar se há token salvo e tentar renovar
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        })

        if (response.ok) {
          const { accessToken, user } = await response.json()
          localStorage.setItem("accessToken", accessToken)
          setUser(user)
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Configurar renovação automática
    const interval = setInterval(
      async () => {
        try {
          const response = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          })

          if (response.ok) {
            const { accessToken, user } = await response.json()
            localStorage.setItem("accessToken", accessToken)
            setUser(user)
          } else {
            // Refresh token expirado
            setUser(null)
            localStorage.clear()
          }
        } catch (error) {
          console.error("Erro na renovação automática:", error)
          setUser(null)
          localStorage.clear()
        }
      },
      25 * 60 * 1000,
    ) // Renovar a cada 25 minutos

    return () => clearInterval(interval)
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Erro no login")
    }

    const { accessToken, user } = await response.json()
    localStorage.setItem("accessToken", accessToken)
    setUser(user)
  }

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    })

    localStorage.clear()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider")
  }
  return context
}
