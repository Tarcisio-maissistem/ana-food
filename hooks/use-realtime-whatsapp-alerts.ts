"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
})

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
  const errorCountRef = useRef(0)
  const lastErrorTimeRef = useRef(0)
  const maxRetries = 5
  const isCircuitBreakerOpen = useRef(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

  const startPollingFallback = useCallback(async () => {
    if (pollingIntervalRef.current) return

    console.log("[v0] Realtime WhatsApp: Iniciando polling fallback")
    pollingIntervalRef.current = setInterval(async () => {
      await loadInitialAlerts()
    }, 30000) // Poll every 30 seconds
  }, [loadInitialAlerts])

  const stopPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const currentUserId = userId || (await getUserId())
      if (!currentUserId) {
        if (Date.now() - lastErrorTimeRef.current > 60000) {
          console.error("[v0] Realtime WhatsApp: User ID não encontrado")
          lastErrorTimeRef.current = Date.now()
        }
        return
      }

      if (isCircuitBreakerOpen.current) {
        if (!pollingIntervalRef.current) {
          startPollingFallback()
        }
        return
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      if (errorCountRef.current === 0) {
        console.log("[v0] Realtime WhatsApp: Configurando subscription para user:", currentUserId)
      }

      try {
        channelRef.current = supabase
          .channel(`whatsapp-alerts-${currentUserId}`, {
            config: {
              broadcast: { self: false },
              presence: { key: currentUserId },
              timeout: 15000, // Reduced timeout
              heartbeat: { interval: 30000 }, // Reduced heartbeat interval
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
              try {
                const newAlert = payload.new as WhatsAppAlert
                if (!shownAlertsRef.current.has(newAlert.id)) {
                  setAlerts((prev) => [newAlert, ...prev])
                  shownAlertsRef.current.add(newAlert.id)

                  if (Notification.permission === "granted") {
                    new Notification("Nova mensagem WhatsApp", {
                      body: `${newAlert.customer_name}: ${newAlert.message.substring(0, 50)}...`,
                      icon: "/whatsapp-icon.png",
                    })
                  }
                }
              } catch (error) {
                console.error("[v0] Realtime WhatsApp: Erro ao processar novo alerta:", error)
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
              try {
                const updatedAlert = payload.new as WhatsAppAlert
                setAlerts((prev) => prev.map((alert) => (alert.id === updatedAlert.id ? updatedAlert : alert)))
              } catch (error) {
                console.error("[v0] Realtime WhatsApp: Erro ao processar atualização:", error)
              }
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
              try {
                setAlerts((prev) => prev.filter((alert) => alert.id !== payload.old.id))
                shownAlertsRef.current.delete(payload.old.id)
              } catch (error) {
                console.error("[v0] Realtime WhatsApp: Erro ao processar remoção:", error)
              }
            },
          )
          .subscribe((status) => {
            try {
              if (status === "SUBSCRIBED") {
                setIsConnected(true)
                errorCountRef.current = 0
                isCircuitBreakerOpen.current = false
                stopPollingFallback()
              } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                setIsConnected(false)
                errorCountRef.current++

                if (errorCountRef.current >= maxRetries) {
                  isCircuitBreakerOpen.current = true
                  console.error("[v0] Realtime WhatsApp: Muitos erros, ativando fallback polling")
                  startPollingFallback()
                } else if (errorCountRef.current === 1 || errorCountRef.current % 5 === 0) {
                  console.error(`[v0] Realtime WhatsApp: Erro de conexão (${errorCountRef.current}x)`)
                }
              } else {
                setIsConnected(status === "SUBSCRIBED")
              }
            } catch (error) {
              console.error("[v0] Realtime WhatsApp: Erro no callback de status:", error)
            }
          })
      } catch (error) {
        console.error("[v0] Realtime WhatsApp: Erro ao configurar subscription:", error)
        errorCountRef.current++
        if (errorCountRef.current >= maxRetries) {
          isCircuitBreakerOpen.current = true
          startPollingFallback()
        }
      }
    }

    if (!isLoadingRef.current && alerts.length === 0) {
      loadInitialAlerts().then(() => {
        setupRealtimeSubscription()
      })
    } else if (userId) {
      setupRealtimeSubscription()
    }

    if (Notification.permission === "default") {
      Notification.requestPermission()
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      stopPollingFallback()
    }
  }, [userId, getUserId, loadInitialAlerts, alerts.length, startPollingFallback, stopPollingFallback])

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
    alerts: alerts.filter((alert) => !alert.is_read),
    unreadCount,
    isConnected,
    markAsRead,
    removeAlert,
    refreshAlerts,
  }
}
