"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Menu, User, Settings, LogOut, Phone } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TopbarProps {
  onMenuToggle: () => void
}

interface WhatsAppAlert {
  id: string
  customerName: string
  message: string
  phone?: string
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [whatsappAlerts, setWhatsappAlerts] = useState<WhatsAppAlert[]>([])
  const [showWhatsappAlerts, setShowWhatsappAlerts] = useState(false)

  const loadWhatsappAlerts = async () => {
    try {
      const response = await fetch("/api/whatsapp-alerts")
      if (response.ok) {
        const alerts = await response.json()
        setWhatsappAlerts(alerts)
      }
    } catch (error) {
      console.error("Erro ao carregar alertas WhatsApp:", error)
    }
  }

  const openWhatsApp = (phone: string) => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, "")
    const whatsappUrl = `https://wa.me/${cleanPhone}`
    window.open(whatsappUrl, "_blank")
  }

  const removeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/whatsapp-alerts/${alertId}`, { method: "DELETE" })
      setWhatsappAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
    } catch (error) {
      console.error("Erro ao remover alerta:", error)
    }
  }

  const handleAlertClick = (alert: WhatsAppAlert) => {
    openWhatsApp(alert.phone || alert.id)
    removeAlert(alert.id)
    setShowWhatsappAlerts(false)
  }

  useEffect(() => {
    loadWhatsappAlerts()
    const interval = setInterval(loadWhatsappAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-1">
      <div className="flex items-center justify-between leading-4 h-9">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onMenuToggle} className="lg:hidden">
            <Menu className="w-4 h-4" />
          </Button>

          <div className="relative">
            
            
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className={`relative h-8 w-8 p-0 ${whatsappAlerts.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => whatsappAlerts.length > 0 && setShowWhatsappAlerts(!showWhatsappAlerts)}
              disabled={whatsappAlerts.length === 0}
            >
              <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
              </svg>
              {whatsappAlerts.length > 0 && (
                <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                  {whatsappAlerts.length}
                </Badge>
              )}
            </Button>

            {showWhatsappAlerts && whatsappAlerts.length > 0 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowWhatsappAlerts(false)} />
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b">
                    <h3 className="font-semibold text-sm">Mensagens WhatsApp</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {whatsappAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleAlertClick(alert)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 mb-1">
                              {alert.customerName || alert.phone || alert.id}
                            </div>
                            <div className="text-sm text-gray-600 line-clamp-2 mb-2">{alert.message}</div>
                            <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                              <Phone className="w-3 h-3" />
                              Abrir WhatsApp
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8">
                <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
                <span className="hidden md:inline text-sm">Admin</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-sm">
                <User className="w-4 h-4 mr-2" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm">
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 text-sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
