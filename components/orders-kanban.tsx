"use client"
import { useSettings } from "@/hooks/use-settings"
import { useUser } from "./main-dashboard" // Importando contexto de usuário
import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Clock,
  Printer,
  Eye,
  Bell,
  BellOff,
  Truck,
  Package,
  Filter,
  Loader2,
  Phone,
  AlertTriangle,
  Store,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { toast } from "react-hot-toast"

interface OrderItem {
  id?: string
  name?: string
  nome?: string // Adicionado campo nome do banco
  quantity?: number
  quantidade?: number // Adicionado campo quantidade do banco
  price?: number
  preco?: number // Adicionado campo preco do banco
  complements?: string[]
  observacoes?: string // Adicionado campo observacoes do banco
}

interface Order {
  id: string
  number: number | string
  customerName: string
  phone: string
  items: OrderItem[]
  paymentMethod: string
  address?: string
  observations?: string
  status: "novo" | "preparando" | "pronto" | "em_entrega" | "concluido" | "cancelado"
  type: "delivery" | "retirada"
  createdAt: Date
  estimatedTime?: number
  deliveryFee?: number // Adicionado taxa de entrega
}

const statusColumns = [
  { id: "novo", title: "Novo", color: "bg-blue-500" },
  { id: "preparando", title: "Em Preparo", color: "bg-yellow-500" },
  { id: "pronto", title: "Pronto", color: "bg-green-500" },
  { id: "em_entrega", title: "Em Entrega", color: "bg-purple-500" },
  { id: "concluido", title: "Concluídos", color: "bg-gray-500" },
  { id: "cancelado", title: "Cancelado", color: "bg-red-500" },
]

export function OrdersKanban() {
  const { user } = useUser() // Obtendo usuário do contexto
  const { settings, updateSetting, getSetting, loading: settingsLoading } = useSettings(user?.id || "default-user") // Passando userId real para useSettings
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null)
  const [whatsappAlerts, setWhatsappAlerts] = useState<
    Array<{ id: string; customerName: string; message: string; phone?: string }>
  >([])
  const [showWhatsappAlerts, setShowWhatsappAlerts] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [storeOpen, setStoreOpen] = useState(getSetting("store_open", { open: true }).open)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [autoAccept, setAutoAcceptState] = useState(getSetting("auto_accept", { enabled: false }).enabled)
  const [visibleColumns, setVisibleColumnsState] = useState(
    getSetting("visible_columns", {
      novo: true,
      preparando: true,
      pronto: true,
      em_entrega: true,
      concluido: true,
      cancelado: false,
    }),
  )

  const [deliveryTime, setDeliveryTime] = useState(getSetting("delivery_time", { minutes: 30 }).minutes)
  const [pickupTime, setPickupTime] = useState(getSetting("pickup_time", { minutes: 45 }).minutes)
  const [searchTerm, setSearchTerm] = useState("")

  const timeOptions = [5, 10, 15, 30, 45, 60, 75, 90, 105, 120]

  const handleDeliveryTimeChange = (minutes: number) => {
    setDeliveryTime(minutes)
    updateSetting("delivery_time", { minutes })
    toast.success(`Tempo de entrega atualizado: ${minutes} min`)
  }

  const handlePickupTimeChange = (minutes: number) => {
    setPickupTime(minutes)
    updateSetting("pickup_time", { minutes })
    toast.success(`Tempo de retirada atualizado: ${minutes} min`)
  }

  const autoAcceptSetting = getSetting("auto_accept", { enabled: false }).enabled
  const soundEnabled = getSetting("sound_enabled", { enabled: true }).enabled
  const alertTime = getSetting("alert_time", { minutes: 60 }).minutes
  const defaultDeliveryFee = getSetting("delivery_fee", { value: 5.0 }).value

  const isOrderDelayed = (order: Order) => {
    const elapsedMinutes = Math.floor((Date.now() - order.createdAt.getTime()) / 60000)
    return elapsedMinutes > alertTime
  }

  const handleDragStart = (e: React.DragEvent, order: Order) => {
    setDraggedOrder(order)
    e.dataTransfer.effectAllowed = "move"
    e.currentTarget.classList.add("dragging")
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("dragging")
    setDraggedOrder(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, newStatus: Order["status"]) => {
    e.preventDefault()
    if (draggedOrder && draggedOrder.status !== newStatus) {
      setOrders((prev) => prev.map((order) => (order.id === draggedOrder.id ? { ...order, status: newStatus } : order)))

      try {
        await updateOrderStatus(draggedOrder.id, newStatus)
      } catch (error) {
        setOrders((prev) =>
          prev.map((order) => (order.id === draggedOrder.id ? { ...order, status: draggedOrder.status } : order)),
        )
        toast.error("Erro ao atualizar status")
      }
    }
    setDraggedOrder(null)
  }

  const setAutoAccept = (enabled: boolean) => {
    console.log("[v0] Aceite automático alterado para:", enabled)

    if (enabled === autoAccept) {
      console.log("[v0] Aceite automático já está no estado:", enabled, "- ignorando atualização")
      return
    }

    updateSetting("auto_accept", { enabled })
    setAutoAcceptState(enabled)

    const newVisibleColumns = {
      ...visibleColumns,
      novo: !enabled, // Oculta coluna novo quando aceite automático está ativo
    }

    if (newVisibleColumns.novo !== visibleColumns.novo) {
      console.log("[v0] Atualizando visible_columns - novo:", newVisibleColumns.novo)
      updateSetting("visible_columns", newVisibleColumns)
      setVisibleColumnsState(newVisibleColumns)
    }

    if (enabled) {
      const novosOrders = orders.filter((order) => order.status === "novo")
      if (novosOrders.length > 0) {
        console.log(
          "[v0] Movendo",
          novosOrders.length,
          "pedidos de 'novo' para 'preparando' devido ao aceite automático",
        )

        // Atualizar estado local imediatamente
        setOrders((prev) => prev.map((order) => (order.status === "novo" ? { ...order, status: "preparando" } : order)))

        // Atualizar no backend
        novosOrders.forEach(async (order) => {
          try {
            await updateOrderStatus(order.id, "preparando")
          } catch (error) {
            console.error("[v0] Erro ao mover pedido automaticamente:", error)
          }
        })

        toast.success(`${novosOrders.length} pedidos aceitos automaticamente`)
      }
    }
  }

  const setSoundEnabled = (enabled: boolean) => {
    updateSetting("sound_enabled", { enabled })
  }

  const toggleColumnVisibility = (columnId: string) => {
    if (columnId === "novo" && autoAccept) {
      toast.error("Não é possível mostrar a coluna 'Novo' com aceite automático ativo")
      return
    }

    const newVisibleColumns = {
      ...visibleColumns,
      [columnId]: !visibleColumns[columnId],
    }
    updateSetting("visible_columns", newVisibleColumns)
    setVisibleColumnsState(newVisibleColumns)
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      console.log("[v0] Botão clicado - Atualizando status do pedido:", orderId, "para:", newStatus)

      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "tarcisiorp16@gmail.com", // Adicionando header com email do usuário
        },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      })

      console.log("[v0] Resposta da API de atualização:", response.status)

      if (!response.ok) {
        const errorData = await response.text()
        console.error("[v0] Erro na resposta da API:", errorData)
        throw new Error("Erro ao atualizar status")
      }

      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)))

      console.log("[v0] Status atualizado com sucesso para:", newStatus)
      toast.success(`Pedido movido para ${newStatus}`)
    } catch (error) {
      console.error("[v0] Erro ao atualizar status:", error)
      toast.error("Erro ao atualizar status do pedido")
    }
  }

  const printOrder = (order: Order) => {
    console.log("🖨️ Imprimindo pedido:", order.number)
  }

  const loadOrders = async () => {
    try {
      console.log("[v0] OrdersKanban: Carregando pedidos")
      setLoading(true)
      const response = await fetch("/api/orders", {
        headers: {
          "x-user-email": user?.email || "tarcisiorp16@gmail.com", // Adicionando header com email do usuário
        },
      })
      console.log("[v0] OrdersKanban: Resposta da API recebida, status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] OrdersKanban: Dados recebidos:", data)

        const ordersWithDates = Array.isArray(data)
          ? data.map((order) => ({
              ...order,
              number: order.order_number
                ? order.order_number.replace(/\D/g, "") || order.order_number
                : order.number || Math.floor(Math.random() * 9000) + 1000,
              phone: order.phone || order.telefone || "",
              items: Array.isArray(order.items)
                ? order.items.map((item) => ({
                    ...item,
                    name: item.nome || item.name || "Item",
                    price: Number(item.preco || item.price || 0),
                    quantity: Number(item.quantidade || item.quantity || 1),
                    complements: Array.isArray(item.complements) ? item.complements : [],
                    observations: item.observacoes || item.observations || "",
                  }))
                : [],
              createdAt: new Date(order.createdAt || order.created_at || Date.now()),
              deliveryFee: Number(
                order.deliveryFee || order.delivery_fee || (order.type === "delivery" ? defaultDeliveryFee : 0),
              ),
            }))
          : []

        console.log("[v0] OrdersKanban: Pedidos processados:", ordersWithDates.length)
        setOrders(ordersWithDates)
      } else {
        console.error("[v0] OrdersKanban: Erro na resposta da API, status:", response.status)
        toast.error("Erro ao carregar pedidos")
      }
    } catch (error) {
      console.error("[v0] OrdersKanban: Erro ao carregar pedidos:", error)
      toast.error("Erro ao carregar pedidos")
    } finally {
      setLoading(false)
      console.log("[v0] OrdersKanban: Carregamento finalizado")
    }
  }

  const loadWhatsappAlerts = async () => {
    try {
      const response = await fetch("/api/whatsapp-alerts", {
        headers: {
          "x-user-email": user?.email || "tarcisiorp16@gmail.com", // Adicionando header com email do usuário
        },
      })
      if (response.ok) {
        const alerts = await response.json()
        setWhatsappAlerts(alerts)
      }
    } catch (error) {
      console.error("Erro ao carregar alertas WhatsApp:", error)
    }
  }

  const openWhatsApp = (phone: string, orderNumber: string | number) => {
    if (!phone) {
      toast.error("Telefone não disponível")
      return
    }

    const cleanPhone = phone.replace(/\D/g, "")
    const message = `Olá! Sobre o pedido #${orderNumber}, como posso ajudar?`
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const toggleStoreStatus = (open: boolean) => {
    setStoreOpen(open)
    updateSetting("store_open", { open })
    toast.success(open ? "Loja aberta para pedidos" : "Loja fechada para pedidos")
  }

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const toggleSelectAll = (columnOrders: Order[]) => {
    const columnOrderIds = columnOrders.map((order) => order.id)
    const allSelected = columnOrderIds.every((id) => selectedOrders.has(id))

    const newSelected = new Set(selectedOrders)
    if (allSelected) {
      columnOrderIds.forEach((id) => newSelected.delete(id))
    } else {
      columnOrderIds.forEach((id) => newSelected.add(id))
    }
    setSelectedOrders(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const bulkPrint = () => {
    const selectedOrdersList = orders.filter((order) => selectedOrders.has(order.id))
    console.log(
      "🖨️ Imprimindo pedidos selecionados:",
      selectedOrdersList.map((o) => o.number),
    )
    toast.success(`${selectedOrdersList.length} pedidos enviados para impressão`)
    setSelectedOrders(new Set())
    setShowBulkActions(false)
  }

  const bulkChangeStatus = async (newStatus: Order["status"]) => {
    const selectedOrdersList = orders.filter((order) => selectedOrders.has(order.id))

    try {
      await Promise.all(selectedOrdersList.map((order) => updateOrderStatus(order.id, newStatus)))

      setOrders((prev) => prev.map((order) => (selectedOrders.has(order.id) ? { ...order, status: newStatus } : order)))

      toast.success(`${selectedOrdersList.length} pedidos atualizados para ${newStatus}`)
      setSelectedOrders(new Set())
      setShowBulkActions(false)
    } catch (error) {
      toast.error("Erro ao atualizar pedidos em lote")
    }
  }

  const toggleItemsExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedItems(newExpanded)
  }

  const openWhatsAppFromAlert = (alert: { customerName: string; phone?: string; id: string }) => {
    const phone = alert.phone || alert.id
    const cleanPhone = phone.replace(/\D/g, "")
    const message = `Olá! Vi que você entrou em contato. Como posso ajudar?`
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()

    // Buscar por número do pedido
    if (order.number.toString().includes(searchLower)) return true

    // Buscar por nome do cliente
    if (order.customerName.toLowerCase().includes(searchLower)) return true

    // Buscar por telefone
    if (order.phone && order.phone.includes(searchTerm)) return true

    // Buscar por itens
    if (Array.isArray(order.items)) {
      const hasMatchingItem = order.items.some((item) =>
        (item.name || item.nome || "").toLowerCase().includes(searchLower),
      )
      if (hasMatchingItem) return true
    }

    // Buscar por endereço
    if (order.address && order.address.toLowerCase().includes(searchLower)) return true

    return false
  })

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadWhatsappAlerts, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-2 pb-20">
      <style jsx>{`
        .dragging {
          opacity: 0.5;
          transform: rotate(2deg);
          transition: all 0.05s ease;
        }
        .drag-over {
          background-color: rgba(59, 130, 246, 0.1);
          border: 2px dashed #3b82f6;
        }
      `}</style>

      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b pb-1">
        <div className="flex flex-col items-start sm:flex-row py-1 mx-0 my-0 px-0 justify-center gap-3 bg-slate-100 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Store className="w-3 h-3" />
              <Switch checked={storeOpen} onCheckedChange={toggleStoreStatus} />
              <span className={`text-xs font-medium ${storeOpen ? "text-green-600" : "text-red-600"}`}>
                {storeOpen ? "Aberto" : "Fechado"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="auto-accept" className="text-xs font-medium">
                Aceite Automático
              </label>
              <Switch id="auto-accept" checked={autoAccept} onCheckedChange={setAutoAccept} />
            </div>

            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border">
              <div className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium">Entrega:</span>
                <select
                  value={deliveryTime}
                  onChange={(e) => handleDeliveryTimeChange(Number(e.target.value))}
                  className="text-xs border rounded px-1 py-0.5 h-6 bg-white"
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time} Min
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium">Retirada:</span>
                <select
                  value={pickupTime}
                  onChange={(e) => handlePickupTimeChange(Number(e.target.value))}
                  className="text-xs border rounded px-1 py-0.5 h-6 bg-white"
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time} Min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border">
              <input
                type="text"
                placeholder="Buscar pedidos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs border rounded px-2 py-1 h-6 bg-white w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                  title="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>

            <Button
              variant={soundEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label={soundEnabled ? "Desativar notificações sonoras" : "Ativar notificações sonoras"}
              className="h-7 px-2"
            >
              {soundEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-7 px-2">
              <Filter className="w-3 h-3" />
              <span className="text-xs ml-1">Filtros</span>
            </Button>

            {showBulkActions && (
              <div className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-lg border">
                <span className="text-xs font-medium text-blue-700">{selectedOrders.size} selecionados</span>
                <Button size="sm" variant="outline" onClick={bulkPrint} className="h-6 px-2 text-xs bg-transparent">
                  <Printer className="w-3 h-3 mr-1" />
                  Imprimir
                </Button>
                <select
                  className="text-xs border rounded px-1 py-0.5 h-6"
                  onChange={(e) => e.target.value && bulkChangeStatus(e.target.value as Order["status"])}
                  defaultValue=""
                >
                  <option value="">Alterar Status</option>
                  <option value="preparando">Em Preparo</option>
                  <option value="pronto">Pronto</option>
                  <option value="em_entrega">Em Entrega</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {showFilters && (
          <Card className="mt-2 p-3">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2 text-xs">Colunas Visíveis</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {statusColumns.map((column) => (
                    <div key={column.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.id}
                        checked={visibleColumns[column.id]}
                        onCheckedChange={() => toggleColumnVisibility(column.id)}
                        disabled={column.id === "novo" && autoAccept}
                      />
                      <label htmlFor={column.id} className="text-xs font-medium">
                        {column.title}
                        {column.id === "novo" && autoAccept && " (Oculto - Aceite Automático)"}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500 text-sm">Carregando pedidos...</span>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-4">
          {statusColumns
            .filter((column) => {
              if (column.id === "novo" && autoAccept) {
                return false
              }
              return visibleColumns[column.id]
            })
            .map((column) => {
              const columnOrders = filteredOrders.filter((order) => order.status === column.id)

              return (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-80 transition-all duration-100"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id as Order["status"])}
                >
                  <div className={`${column.color} text-white p-2 rounded-t-lg`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={
                            columnOrders.length > 0 && columnOrders.every((order) => selectedOrders.has(order.id))
                          }
                          onCheckedChange={() => toggleSelectAll(columnOrders)}
                          className="border-white data-[state=checked]:bg-white data-[state=checked]:text-current"
                        />
                        <h3 className="font-semibold text-sm">
                          {column.title} ({columnOrders.length})
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 min-h-96 p-2 rounded-b-lg space-y-2">
                    {columnOrders.map((order) => {
                      const elapsedMinutes = Math.floor((Date.now() - order.createdAt.getTime()) / 60000)
                      const isDelayed = isOrderDelayed(order)
                      const isExpanded = expandedItems.has(order.id)
                      const itemsToShow = isExpanded ? order.items : (order.items || []).slice(0, 2)

                      return (
                        <Card
                          key={order.id}
                          className={`hover:shadow-md transition-all duration-50 cursor-move ${
                            isDelayed ? "ring-2 ring-red-500 ring-opacity-50" : ""
                          } ${selectedOrders.has(order.id) ? "ring-2 ring-blue-500" : ""}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, order)}
                          onDragEnd={handleDragEnd}
                        >
                          <CardHeader className="pb-1 py-0.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  checked={selectedOrders.has(order.id)}
                                  onCheckedChange={() => toggleOrderSelection(order.id)}
                                />
                                <CardTitle className="text-sm font-bold">#{order.number}</CardTitle>
                              </div>
                              <div
                                className={`flex items-center gap-1 text-xs ${
                                  isDelayed
                                    ? "text-red-600 font-bold bg-red-100 px-2 py-1 rounded-full animate-pulse border border-red-300"
                                    : "text-gray-600"
                                }`}
                              >
                                {isDelayed && <AlertTriangle className="w-3 h-3" />}
                                <Clock className="w-3 h-3" />
                                {elapsedMinutes} min
                                {isDelayed && <span className="text-xs ml-1">ATRASO!</span>}
                              </div>
                            </div>
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                order.type === "delivery" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                              }`}
                            >
                              {order.type === "delivery" ? (
                                <>
                                  <Truck className="w-3 h-3" />
                                  ENTREGA{" "}
                                  {order.deliveryFee && order.deliveryFee > 0 && `R$ ${order.deliveryFee.toFixed(2)}`}
                                </>
                              ) : (
                                <>
                                  <Package className="w-3 h-3" />
                                  RETIRADA
                                </>
                              )}
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-1 py-0.5 text-xs overflow-hidden">
                            <div className="flex items-center gap-1">
                              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-600 font-semibold text-xs">
                                  {order.customerName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs truncate">{order.customerName}</p>
                                {order.phone && (
                                  <button
                                    onClick={() => openWhatsApp(order.phone, order.number)}
                                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 hover:underline truncate"
                                  >
                                    <Phone className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{order.phone}</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="bg-white rounded p-1 border">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs font-medium text-gray-700">
                                  Itens ({order.items?.length || 0}):
                                </div>
                                {Array.isArray(order.items) && order.items.length > 2 && (
                                  <button
                                    onClick={() => toggleItemsExpansion(order.id)}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="w-3 h-3" />
                                        Menos
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3 h-3" />+{order.items.length - 2}
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                              <div className="space-y-1 max-h-20 overflow-y-auto">
                                {Array.isArray(order.items) && order.items.length > 0 ? (
                                  itemsToShow.map((item, index) => (
                                    <div key={index} className="bg-gray-50 p-1 rounded text-xs">
                                      <div className="flex justify-between items-start">
                                        <span className="font-medium text-gray-800 flex-1 mr-1">
                                          {item.quantity || 1}x {item.name || "Item"}
                                        </span>
                                        <span className="font-semibold text-green-600 flex-shrink-0">
                                          R$ {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                        </span>
                                      </div>
                                      {item.observations && (
                                        <div className="text-xs text-gray-500 mt-0.5 italic">
                                          Obs: {item.observations}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-xs text-gray-500 text-center py-2">Nenhum item</div>
                                )}
                              </div>

                              <div className="border-t mt-1 pt-1 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Pagamento:</span>
                                  <span className="font-medium">{order.paymentMethod}</span>
                                </div>
                                <div className="flex justify-between text-xs font-semibold">
                                  <span>Total:</span>
                                  <span className="text-green-600">
                                    R${" "}
                                    {Array.isArray(order.items)
                                      ? (
                                          order.items.reduce(
                                            (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
                                            0,
                                          ) + (order.deliveryFee || 0)
                                        ).toFixed(2)
                                      : "0.00"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                                className="text-xs h-6 px-2"
                                title="Visualizar pedido"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => printOrder(order)}
                                className="text-xs h-6 px-2"
                                title="Imprimir pedido"
                              >
                                <Printer className="w-3 h-3" />
                              </Button>

                              {order.status === "novo" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    console.log("[v0] Clicou em Aceitar pedido:", order.id)
                                    updateOrderStatus(order.id, "preparando")
                                  }}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-xs h-6 flex-1"
                                  disabled={loading}
                                >
                                  Aceitar
                                </Button>
                              )}

                              {order.status === "preparando" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    console.log("[v0] Clicou em Pronto pedido:", order.id)
                                    updateOrderStatus(order.id, "pronto")
                                  }}
                                  className="bg-green-500 hover:bg-green-600 text-xs h-6 flex-1"
                                  disabled={loading}
                                >
                                  Pronto
                                </Button>
                              )}

                              {order.status === "pronto" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const nextStatus = order.type === "delivery" ? "em_entrega" : "concluido"
                                    console.log(
                                      "[v0] Clicou em Enviar/Entregar pedido:",
                                      order.id,
                                      "próximo status:",
                                      nextStatus,
                                    )
                                    updateOrderStatus(order.id, nextStatus)
                                  }}
                                  className="bg-purple-500 hover:bg-purple-600 text-xs h-6 flex-1"
                                  disabled={loading}
                                >
                                  {order.type === "delivery" ? "Enviar" : "Entregar"}
                                </Button>
                              )}

                              {order.status === "em_entrega" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    console.log("[v0] Clicou em Concluir pedido:", order.id)
                                    updateOrderStatus(order.id, "concluido")
                                  }}
                                  className="bg-gray-500 hover:bg-gray-600 text-xs h-6 flex-1"
                                  disabled={loading}
                                >
                                  Concluir
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}

                    {columnOrders.length === 0 && (
                      <div className="text-center py-6 text-gray-500 text-xs">
                        {searchTerm ? "Nenhum pedido encontrado" : "Nenhum pedido"}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Pedido #{selectedOrder?.number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="text-center border-b border-gray-300 pb-3">
                <div className="font-bold text-lg">ANA FOOD</div>
                <div className="text-sm text-gray-600">Rua Principal, 456</div>
                <div className="text-sm text-gray-600">Tel: (11) 99999-9999</div>
              </div>

              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="font-bold text-lg mb-2">Pedido nº {selectedOrder.number}</div>

                <div className="mb-3">
                  <div className="font-semibold mb-2">Itens:</div>
                  {Array.isArray(selectedOrder.items) &&
                    selectedOrder.items.map((item, index) => (
                      <div key={index} className="mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {item.quantity || 1}
                          </div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        {item.observations && (
                          <div className="ml-8 text-sm text-gray-600 bg-yellow-50 p-2 rounded mt-1">
                            <strong>OBS:</strong> {item.observations}
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">💳</span>
                  </div>
                  <span className="font-medium">{selectedOrder.paymentMethod}</span>
                  {selectedOrder.paymentMethod.toLowerCase().includes("crédito") && (
                    <span className="text-sm text-gray-500">(Crédito)</span>
                  )}
                </div>

                {selectedOrder.type === "delivery" && selectedOrder.address && (
                  <div className="mb-3">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs">📍</span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">{selectedOrder.address}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          (Estimativa: entre {deliveryTime - 15}~{deliveryTime} minutos)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrder.type === "retirada" && (
                  <div className="mb-3 text-sm text-gray-600">
                    (Estimativa: entre {pickupTime - 15}~{pickupTime} minutos)
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-green-600">
                      R${" "}
                      {Array.isArray(selectedOrder.items)
                        ? (
                            selectedOrder.items.reduce(
                              (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
                              0,
                            ) + (selectedOrder.deliveryFee || 0)
                          ).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedOrder.phone && (
                <div className="text-center">
                  <Button
                    onClick={() => openWhatsApp(selectedOrder.phone, selectedOrder.number)}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Abrir WhatsApp
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
