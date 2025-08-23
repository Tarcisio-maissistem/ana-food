"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ShoppingCart, Package, Users, Settings, ChefHat, X } from "lucide-react"
import type { Screen } from "./main-dashboard"
import { useUser } from "./main-dashboard"
import { useState, useEffect } from "react"

interface SidebarProps {
  currentScreen: Screen
  onScreenChange: (screen: Screen) => void
  isOpen: boolean
  onToggle: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

const menuItems = [
  { id: "pedidos" as Screen, label: "Pedidos", icon: ShoppingCart },
  { id: "produtos" as Screen, label: "Produtos", icon: Package },
  { id: "clientes" as Screen, label: "Clientes", icon: Users },
  { id: "configuracoes" as Screen, label: "Configurações", icon: Settings },
]

export function Sidebar({
  currentScreen,
  onScreenChange,
  isOpen,
  onToggle,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { user } = useUser()
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string>("Ana Food")

  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        const response = await fetch("/api/companies", {
          headers: {
            "X-User-Email": "tarcisiorp16@gmail.com",
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data) {
            setCompanyName(data.name || "Ana Food")
            if (data.logo_url) {
              setCompanyLogo(data.logo_url)
            } else if (data.cnpj) {
              // Tentar carregar logo do localStorage
              const logoKey = `logo_${data.cnpj}`
              const savedLogo = localStorage.getItem(logoKey)
              if (savedLogo) {
                setCompanyLogo(savedLogo)
              }
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados da empresa:", error)
      }
    }

    loadCompanyData()
  }, [])

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onToggle} />}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-gray-200 p-6",
            isCollapsed ? "justify-center p-4" : "justify-between",
          )}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onScreenChange("pedidos")}>
              {companyLogo ? (
                <img
                  src={companyLogo || "/placeholder.svg"}
                  alt="Logo da empresa"
                  className="w-8 h-8 rounded-lg object-contain"
                />
              ) : (
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-xl font-bold text-gray-900">{companyName}</span>
            </div>
          )}

          {isCollapsed && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden"
              onClick={() => onScreenChange("pedidos")}
            >
              {companyLogo ? (
                <img
                  src={companyLogo || "/placeholder.svg"}
                  alt="Logo da empresa"
                  className="w-8 h-8 rounded-lg object-contain"
                />
              ) : (
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="hidden lg:flex"
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? "→" : "←"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggle} className="lg:hidden">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={currentScreen === item.id ? "default" : "ghost"}
                className={cn(
                  "w-full gap-3 h-12 transition-all duration-200 font-semibold",
                  isCollapsed ? "justify-center px-0" : "justify-start",
                  currentScreen === item.id && "bg-orange-500 hover:bg-orange-600 text-white",
                )}
                onClick={() => {
                  onScreenChange(item.id)
                  if (window.innerWidth < 1024) {
                    onToggle()
                  }
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5" />
                {!isCollapsed && item.label}
              </Button>
            )
          })}
        </nav>

        {!isCollapsed && user && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-gray-50">
            <Button
              variant="ghost"
              className="w-full p-4 h-auto justify-start hover:bg-gray-100"
              onClick={() => onScreenChange("configuracoes")}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name || "Usuário"}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <Settings className="w-4 h-4 text-gray-400" />
              </div>
            </Button>
          </div>
        )}
      </aside>
    </>
  )
}
