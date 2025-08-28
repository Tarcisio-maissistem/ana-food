"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { MessageCircle, X, ExternalLink, Wifi, WifiOff } from "lucide-react"
import { useRealtimeWhatsAppAlerts } from "@/hooks/use-realtime-whatsapp-alerts"

interface WhatsAppAlertsManagerProps {
  userEmail?: string
}

export function WhatsAppAlertsManager({ userEmail = "tarcisiorp16@gmail.com" }: WhatsAppAlertsManagerProps) {
  const [showAlerts, setShowAlerts] = useState(false)
  const { alerts, unreadCount, isConnected, markAsRead, removeAlert } = useRealtimeWhatsAppAlerts(userEmail)

  const handleAlertClick = async (alert: any) => {
    try {
      // Mark as read first
      await markAsRead(alert.id)

      // Open WhatsApp
      if (alert.phone) {
        const cleanPhone = alert.phone.replace(/\D/g, "")
        const whatsappUrl = `https://wa.me/${cleanPhone}`
        window.open(whatsappUrl, "_blank")
      }

      // Close alerts panel
      setShowAlerts(false)
    } catch (error) {
      console.error("[v0] WhatsApp Alerts: Erro ao processar clique:", error)
    }
  }

  const handleRemoveAlert = async (alertId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    await removeAlert(alertId)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className={`relative h-8 w-8 p-0 transition-all duration-200 ${
          unreadCount === 0 ? "opacity-60" : "opacity-100 hover:scale-105"
        }`}
        onClick={() => unreadCount > 0 && setShowAlerts(!showAlerts)}
        disabled={unreadCount === 0}
      >
        <div className="relative">
          <MessageCircle className={`w-4 h-4 ${isConnected ? "text-green-600" : "text-gray-400"}`} />

          {/* Connection status indicator */}
          <div
            className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}
          />

          {/* Unread count badge */}
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </Button>

      {showAlerts && unreadCount > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowAlerts(false)} />
          <Card className="absolute top-full right-0 mt-2 w-96 bg-white border shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-green-50 to-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Mensagens WhatsApp</h3>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {unreadCount} nova{unreadCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 text-green-500" />
                      <span>Tempo real</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-red-500" />
                      <span>Desconectado</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Alerts list */}
            <div className="max-h-80 overflow-y-auto">
              {alerts.map((alert, index) => (
                <div
                  key={alert.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${
                    index === 0 ? "bg-green-50" : ""
                  }`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Customer info */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{alert.customer_name || "Cliente"}</div>
                          <div className="text-xs text-gray-500">{alert.phone}</div>
                        </div>
                        {index === 0 && <Badge className="bg-green-500 text-white text-xs animate-bounce">Nova</Badge>}
                      </div>

                      {/* Message preview */}
                      <div className="text-sm text-gray-700 mb-3 line-clamp-2 bg-white p-2 rounded border-l-2 border-green-200">
                        {alert.message}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                          <ExternalLink className="w-3 h-3" />
                          Abrir WhatsApp
                        </div>
                        <div className="text-xs text-gray-400">{new Date(alert.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all"
                      onClick={(e) => handleRemoveAlert(alert.id, e)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 border-t">
              <div className="text-xs text-gray-500 text-center">
                Clique em uma mensagem para abrir o WhatsApp automaticamente
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
