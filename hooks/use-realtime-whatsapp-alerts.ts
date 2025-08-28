"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface WhatsAppAlert {
  id: string
  customer_name: string
  phone: string
  message: string
  order_id?: string
  is_read: boolean
  created_at: string
  updated_at: string
  user_id: string
}

interface UseRealtimeWhatsAppAlertsReturn {
  alerts: WhatsAppAlert[]
  unreadCount: number
  isConnected: boolean
  markAsRead: (alertId: string) => Promise<void>
  removeAlert: (alertId: string) => Promise<void>
  refreshAlerts: () => Promise<void>
}

export function useRealtimeWhatsAppAlerts(userEmail = "tarcisiorp16@gmail.com"): UseRealtimeWhatsAppAlertsReturn {
  const [alerts, setAlerts] = useState<WhatsAppAlert[]>([])
  const [isConnected, setIsConnected] = useState(true) // Always connected via polling
  const isLoadingRef = useRef(false)
  const shownAlertsRef = useRef(new Set<string>())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadAlerts = useCallback(async () => {
    if (isLoadingRef.current) return

    try {
      isLoadingRef.current = true
      const response = await fetch("/api/whatsapp-alerts", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const newAlerts = data || []

        newAlerts.forEach((alert: WhatsAppAlert) => {
          if (!shownAlertsRef.current.has(alert.id)) {
            shownAlertsRef.current.add(alert.id)

            // Show notification for new alerts
            if (Notification.permission === "granted" && alerts.length > 0) {
              new Notification("Nova mensagem WhatsApp", {
                body: `${alert.customer_name}: ${alert.message.substring(0, 50)}...`,
                icon: "/whatsapp-icon.png",
              })
            }
          }
        })

        setAlerts(newAlerts)
        setIsConnected(true)
      } else {
        setIsConnected(false)
      }
    } catch (error) {
      console.error("[v0] WhatsApp Alerts: Erro ao carregar alertas:", error)
      setIsConnected(false)
    } finally {
      isLoadingRef.current = false
    }
  }, [userEmail, alerts.length])

  useEffect(() => {
    // Load initial alerts
    loadAlerts()

    // Set up polling every 30 seconds
    pollingIntervalRef.current = setInterval(loadAlerts, 30000)

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission()
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [loadAlerts])

  const markAsRead = useCallback(
    async (alertId: string) => {
      try {
        const response = await fetch("/api/whatsapp-alerts", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": userEmail,
          },
          body: JSON.stringify({ id: alertId, is_read: true }),
        })

        if (response.ok) {
          setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, is_read: true } : alert)))
        }
      } catch (error) {
        console.error("[v0] WhatsApp Alerts: Erro ao marcar como lido:", error)
      }
    },
    [userEmail],
  )

  const removeAlert = useCallback(
    async (alertId: string) => {
      try {
        const response = await fetch(`/api/whatsapp-alerts/${alertId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": userEmail,
          },
        })

        if (response.ok) {
          setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
          shownAlertsRef.current.delete(alertId)
        }
      } catch (error) {
        console.error("[v0] WhatsApp Alerts: Erro ao remover alerta:", error)
      }
    },
    [userEmail],
  )

  const refreshAlerts = useCallback(async () => {
    await loadAlerts()
  }, [loadAlerts])

  const unreadCount = alerts.filter((alert) => !alert.is_read).length

  return {
    alerts: alerts.filter((alert) => !alert.is_read),
    unreadCount,
    isConnected,
    markAsRead,
    removeAlert,
    refreshAlerts,
  }
}
