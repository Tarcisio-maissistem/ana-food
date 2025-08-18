"use client"

import { useState, createContext, useContext } from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { OrdersKanban } from "./orders-kanban"
import { ProductsScreen } from "./products-screen"
import { PrintersScreen } from "./printers-screen"
import { CustomersScreen } from "./customers-screen"
import { SettingsScreen } from "./settings-screen"
import { CategoriesScreen } from "./categories-screen"
import { AdditionalsScreen } from "./additionals-screen"

export type Screen = "pedidos" | "produtos" | "clientes" | "impressoras" | "categorias" | "adicionais" | "configuracoes"

interface UserContextType {
  user: {
    id: string
    email: string
    name: string
  } | null
}

const UserContext = createContext<UserContextType>({ user: null })

export const useUser = () => useContext(UserContext)

interface MainDashboardProps {
  user?: {
    id: string
    email: string
    name: string
  } | null
}

export function MainDashboard({ user }: MainDashboardProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>("pedidos")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const renderScreen = () => {
    switch (currentScreen) {
      case "pedidos":
        return <OrdersKanban />
      case "produtos":
        return <ProductsScreen />
      case "clientes":
        return <CustomersScreen />
      case "impressoras":
        return <PrintersScreen />
      case "categorias":
        return <CategoriesScreen />
      case "adicionais":
        return <AdditionalsScreen />
      case "configuracoes":
        return <SettingsScreen />
      default:
        return <OrdersKanban />
    }
  }

  return (
    <UserContext.Provider value={{ user }}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          currentScreen={currentScreen}
          onScreenChange={setCurrentScreen}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 overflow-auto p-3 my-0 py-0">{renderScreen()}</main>
        </div>
      </div>
    </UserContext.Provider>
  )
}
