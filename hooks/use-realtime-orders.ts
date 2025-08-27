"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabaseClient } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface Order {
  id: string
  numero_pedido: string
  status: "novo" | "preparando" | "pronto" | "em_entrega" | "concluido" | "cancelado"
  nome_cliente: string
  telefone: string
  endereco?: string
  itens: any[]
  pagamento: string
  subtotal: number
  taxa_entrega: number
  total: number
  created_at: string
  updated_at: string
  cnpj?: string
}

export function useRealtimeOrders(cnpj?: string) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const channelRef = useRef<RealtimeChannel | null>(null)

  const loadInitialOrders = useCallback(async () => {
    if (!cnpj) return

    try {
      console.log("[v0] Realtime Orders: Loading initial orders for CNPJ:", cnpj)
      const response = await fetch("/api/orders", {
        headers: {
          "X-User-Email": "tarcisiorp16@gmail.com", // Replace with actual user email
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Realtime Orders: Loaded", data.length, "initial orders")
        setOrders(data)
      }
    } catch (error) {
      console.error("[v0] Realtime Orders: Error loading initial orders:", error)
    }
  }, [cnpj])

  const subscribeToOrders = useCallback(() => {
    if (!cnpj || isSubscribed) return

    console.log("[v0] Realtime Orders: Subscribing to orders for CNPJ:", cnpj)
    setConnectionStatus("connecting")

    // Create channel with CNPJ-specific name
    const channel = supabaseClient.channel(`orders-cnpj-${cnpj}`)

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `cnpj=eq.${cnpj}`,
        },
        (payload) => {
          console.log("[v0] Realtime Orders: New order received:", payload.new)
          const newOrder = payload.new as Order
          setOrders((prev) => [newOrder, ...prev])
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `cnpj=eq.${cnpj}`,
        },
        (payload) => {
          console.log("[v0] Realtime Orders: Order updated:", payload.new)
          const updatedOrder = payload.new as Order
          setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)))
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
          filter: `cnpj=eq.${cnpj}`,
        },
        (payload) => {
          console.log("[v0] Realtime Orders: Order deleted:", payload.old)
          const deletedOrder = payload.old as Order
          setOrders((prev) => prev.filter((order) => order.id !== deletedOrder.id))
        },
      )
      .subscribe((status) => {
        console.log("[v0] Realtime Orders: Subscription status:", status)
        if (status === "SUBSCRIBED") {
          setIsSubscribed(true)
          setConnectionStatus("connected")
          loadInitialOrders() // Load initial data after successful subscription
        } else if (status === "CHANNEL_ERROR") {
          setConnectionStatus("disconnected")
          setIsSubscribed(false)
        }
      })

    channelRef.current = channel
  }, [cnpj, isSubscribed, loadInitialOrders])

  const unsubscribeFromOrders = useCallback(() => {
    if (channelRef.current) {
      console.log("[v0] Realtime Orders: Unsubscribing from orders")
      supabaseClient.removeChannel(channelRef.current)
      channelRef.current = null
      setIsSubscribed(false)
      setConnectionStatus("disconnected")
    }
  }, [])

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: Order["status"]) => {
    try {
      console.log("[v0] Realtime Orders: Updating order status:", orderId, newStatus)

      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": "tarcisiorp16@gmail.com", // Replace with actual user email
        },
        body: JSON.stringify({
          id: orderId,
          status: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update order status")
      }

      console.log("[v0] Realtime Orders: Order status updated successfully")
    } catch (error) {
      console.error("[v0] Realtime Orders: Error updating order status:", error)
      throw error
    }
  }, [])

  useEffect(() => {
    return () => {
      unsubscribeFromOrders()
    }
  }, [unsubscribeFromOrders])

  return {
    orders,
    isSubscribed,
    connectionStatus,
    subscribeToOrders,
    unsubscribeFromOrders,
    updateOrderStatus,
  }
}
