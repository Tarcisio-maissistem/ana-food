"use client"

import { useState } from "react"
import { LoginScreen } from "./login-screen"
import { MainDashboard } from "./main-dashboard"

export function AnaFoodApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />
  }

  return <MainDashboard />
}
