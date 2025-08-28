"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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
  const [isConnected, setIsConnected] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const getUserId = useCallback(async () => {
    try {
      const response = await fetch("/api/whatsapp-alerts", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
      })

      if (response.ok) {
        // Get user ID from a separate endpoint or derive it
        const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

        if (user) {
          setUserId(user.id)
          return user.id
        }
      }
    } catch (error) {
      console.error("[v0] Realtime WhatsApp: Erro ao obter user ID:", error)
    }
    return null
  }, [userEmail])

  const loadInitialAlerts = useCallback(async () => {
    try {
      console.log("[v0] Realtime WhatsApp: Carregando alertas iniciais...")
      const response = await fetch("/api/whatsapp-alerts", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Realtime WhatsApp: Alertas iniciais carregados:", data.length)
        setAlerts(data || [])
      }
    } catch (error) {
      console.error("[v0] Realtime WhatsApp: Erro ao carregar alertas iniciais:", error)
    }
  }, [userEmail])

  useEffect(() => {
    let channel: any = null

    const setupRealtimeSubscription = async () => {
      const currentUserId = userId || (await getUserId())
      if (!currentUserId) {
        console.log("[v0] Realtime WhatsApp: User ID não encontrado, usando polling fallback")
        return
      }

      console.log("[v0] Realtime WhatsApp: Configurando subscription para user:", currentUserId)

      // Create channel for this specific user's alerts
      channel = supabase
        .channel(`whatsapp-alerts-${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "whatsapp_alerts",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            console.log("[v0] Realtime WhatsApp: Novo alerta recebido:", payload.new)
            setAlerts((prev) => [payload.new as WhatsAppAlert, ...prev])

            // Show browser notification if permission granted
            if (Notification.permission === "granted") {
              new Notification("Nova mensagem WhatsApp", {
                body: `${payload.new.customer_name}: ${payload.new.message.substring(0, 50)}...`,
                icon: "/whatsapp-icon.png",
              })
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "whatsapp_alerts",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            console.log("[v0] Realtime WhatsApp: Alerta atualizado:", payload.new)
            setAlerts((prev) =>
              prev.map((alert) => (alert.id === payload.new.id ? (payload.new as WhatsAppAlert) : alert)),
            )
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "whatsapp_alerts",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            console.log("[v0] Realtime WhatsApp: Alerta removido:", payload.old)
            setAlerts((prev) => prev.filter((alert) => alert.id !== payload.old.id))
          },
        )
        .subscribe((status) => {
          console.log("[v0] Realtime WhatsApp: Status da subscription:", status)
          setIsConnected(status === "SUBSCRIBED")
        })
    }

    // Load initial data and setup subscription
    loadInitialAlerts().then(() => {
      setupRealtimeSubscription()
    })

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission()
    }

    return () => {
      if (channel) {
        console.log("[v0] Realtime WhatsApp: Removendo subscription")
        supabase.removeChannel(channel)
      }
    }
  }, [userId, getUserId, loadInitialAlerts])

  const markAsRead = useCallback(
    async (alertId: string) => {
      try {
        console.log("[v0] Realtime WhatsApp: Marcando alerta como lido:", alertId)
        const response = await fetch("/api/whatsapp-alerts", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": userEmail,
          },
          body: JSON.stringify({ id: alertId, is_read: true }),
        })

        if (response.ok) {
          // Update local state immediately for better UX
          setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, is_read: true } : alert)))
        }
      } catch (error) {
        console.error("[v0] Realtime WhatsApp: Erro ao marcar como lido:", error)
      }
    },
    [userEmail],
  )

  const removeAlert = useCallback(
    async (alertId: string) => {
      try {
        console.log("[v0] Realtime WhatsApp: Removendo alerta:", alertId)
        const response = await fetch(`/api/whatsapp-alerts/${alertId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": userEmail,
          },
        })

        if (response.ok) {
          // Update local state immediately for better UX
          setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
        }
      } catch (error) {
        console.error("[v0] Realtime WhatsApp: Erro ao remover alerta:", error)
      }
    },
    [userEmail],
  )

  const refreshAlerts = useCallback(async () => {
    await loadInitialAlerts()
  }, [loadInitialAlerts])

  const unreadCount = alerts.filter((alert) => !alert.is_read).length

  return {
    alerts: alerts.filter((alert) => !alert.is_read), // Only show unread alerts
    unreadCount,
    isConnected,
    markAsRead,
    removeAlert,
    refreshAlerts,
  }
}
