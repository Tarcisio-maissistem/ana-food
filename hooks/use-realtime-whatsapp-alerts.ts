"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  const isLoadingRef = useRef(false)
  const shownAlertsRef = useRef(new Set<string>())
  const channelRef = useRef<any>(null)

  const getUserId = useCallback(async () => {
    if (isLoadingRef.current) return userId

    try {
      isLoadingRef.current = true
      const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

      if (user) {
        setUserId(user.id)
        return user.id
      }
    } catch (error) {
      console.error("[v0] Realtime WhatsApp: Erro ao obter user ID:", error)
    } finally {
      isLoadingRef.current = false
    }
    return null
  }, [userEmail, userId])

  const loadInitialAlerts = useCallback(async () => {
    if (isLoadingRef.current) return

    try {
      isLoadingRef.current = true
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
        data?.forEach((alert: WhatsAppAlert) => {
          shownAlertsRef.current.add(alert.id)
        })
      }
    } catch (error) {
      console.error("[v0] Realtime WhatsApp: Erro ao carregar alertas iniciais:", error)
    } finally {
      isLoadingRef.current = false
    }
  }, [userEmail])

  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const currentUserId = userId || (await getUserId())
      if (!currentUserId) {
        console.log("[v0] Realtime WhatsApp: User ID não encontrado")
        return
      }

      if (channelRef.current) {
        console.log("[v0] Realtime WhatsApp: Removendo subscription anterior")
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      console.log("[v0] Realtime WhatsApp: Configurando subscription para user:", currentUserId)

      channelRef.current = supabase
        .channel(`whatsapp-alerts-${currentUserId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: currentUserId },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "whatsapp_alerts",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            const newAlert = payload.new as WhatsAppAlert
            if (!shownAlertsRef.current.has(newAlert.id)) {
              console.log("[v0] Realtime WhatsApp: Novo alerta recebido:", newAlert.id)
              setAlerts((prev) => [newAlert, ...prev])
              shownAlertsRef.current.add(newAlert.id)

              // Show browser notification only once per alert
              if (Notification.permission === "granted") {
                new Notification("Nova mensagem WhatsApp", {
                  body: `${newAlert.customer_name}: ${newAlert.message.substring(0, 50)}...`,
                  icon: "/whatsapp-icon.png",
                })
              }
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
            const updatedAlert = payload.new as WhatsAppAlert
            console.log("[v0] Realtime WhatsApp: Alerta atualizado:", updatedAlert.id)
            setAlerts((prev) => prev.map((alert) => (alert.id === updatedAlert.id ? updatedAlert : alert)))
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
            console.log("[v0] Realtime WhatsApp: Alerta removido:", payload.old.id)
            setAlerts((prev) => prev.filter((alert) => alert.id !== payload.old.id))
            shownAlertsRef.current.delete(payload.old.id)
          },
        )
        .subscribe((status) => {
          console.log("[v0] Realtime WhatsApp: Status da subscription:", status)
          setIsConnected(status === "SUBSCRIBED")

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.log("[v0] Realtime WhatsApp: Subscription falhou, mantendo dados atuais")
          }
        })
    }

    if (!isLoadingRef.current && alerts.length === 0) {
      loadInitialAlerts().then(() => {
        setupRealtimeSubscription()
      })
    } else if (userId) {
      setupRealtimeSubscription()
    }

    // Request notification permission only once
    if (Notification.permission === "default") {
      Notification.requestPermission()
    }

    return () => {
      if (channelRef.current) {
        console.log("[v0] Realtime WhatsApp: Removendo subscription")
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, getUserId, loadInitialAlerts, alerts.length])

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
