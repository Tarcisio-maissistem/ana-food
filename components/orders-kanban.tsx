"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Clock,
  CreditCard,
  Printer,
  Eye,
  Bell,
  BellOff,
  ChevronRight,
  ChevronLeft,
  Truck,
  Package,
  Filter,
} from "lucide-react"

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  complements: string[]
}

interface Order {
  id: string
  number: number
  customerName: string
  items: OrderItem[]
  paymentMethod: string
  address?: string
  observations?: string
  status: "novo" | "preparando" | "pronto" | "em_entrega" | "concluido" | "cancelado"
  type: "delivery" | "retirada"
  createdAt: Date
  estimatedTime?: number
}

const mockOrders: Order[] = [
  {
    id: "1",
    number: 1001,
    customerName: "João Silva",
    items: [
      { id: "1", name: "X-Burger", quantity: 2, price: 25.9, complements: ["Bacon", "Queijo extra"] },
      { id: "2", name: "Batata Frita", quantity: 1, price: 12.5, complements: [] },
    ],
    paymentMethod: "Cartão de Crédito",
    address: "Rua das Flores, 123 - Centro",
    observations: "Sem cebola no hambúrguer",
    status: "novo",
    type: "delivery",
    createdAt: new Date(),
    estimatedTime: 30,
  },
  {
    id: "2",
    number: 1002,
    customerName: "Maria Santos",
    items: [{ id: "3", name: "Pizza Margherita", quantity: 1, price: 35.0, complements: ["Borda recheada"] }],
    paymentMethod: "PIX",
    status: "preparando",
    type: "retirada",
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
    estimatedTime: 20,
  },
  {
    id: "3",
    number: 1003,
    customerName: "Pedro Costa",
    items: [{ id: "4", name: "Açaí 500ml", quantity: 1, price: 18.0, complements: ["Granola", "Banana", "Mel"] }],
    paymentMethod: "Dinheiro",
    status: "pronto",
    type: "retirada",
    createdAt: new Date(Date.now() - 25 * 60 * 1000),
  },
  {
    id: "4",
    number: 1004,
    customerName: "Ana Lima",
    items: [{ id: "5", name: "Combo Família", quantity: 1, price: 65.0, complements: [] }],
    paymentMethod: "PIX",
    status: "em_entrega",
    type: "delivery",
    address: "Av. Central, 789 - Bairro Novo",
    createdAt: new Date(Date.now() - 35 * 60 * 1000),
  },
  {
    id: "5",
    number: 1005,
    customerName: "Carlos Mendes",
    items: [{ id: "6", name: "Sanduíche Natural", quantity: 1, price: 15.0, complements: [] }],
    paymentMethod: "Dinheiro",
    status: "concluido",
    type: "retirada",
    createdAt: new Date(Date.now() - 45 * 60 * 1000),
  },
]

const statusColumns = [
  { id: "novo", title: "Novo", color: "bg-blue-500" },
  { id: "preparando", title: "Em Preparo", color: "bg-yellow-500" },
  { id: "pronto", title: "Pronto", color: "bg-green-500" },
  { id: "em_entrega", title: "Em Entrega", color: "bg-purple-500" },
  { id: "concluido", title: "Concluídos", color: "bg-gray-500" },
  { id: "cancelado", title: "Cancelado", color: "bg-red-500" },
]

export function OrdersKanban() {
  const [orders, setOrders] = useState<Order[]>(mockOrders)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [autoAccept, setAutoAccept] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    novo: true,
    preparando: true,
    pronto: true,
    em_entrega: true,
    concluido: true,
    cancelado: false, // Oculto por padrão
  })

  const getOrdersByStatus = (status: string) => {
    return orders.filter((order) => order.status === status)
  }

  const updateOrderStatus = (orderId: string, newStatus: Order["status"]) => {
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)))
  }

  const printOrder = (order: Order) => {
    console.log("🖨️ Imprimindo pedido:", order.number)
  }

  const handleDragStart = (e: React.DragEvent, order: Order) => {
    setDraggedOrder(order)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragEnd = () => {
    setDraggedOrder(null)
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetStatus: Order["status"]) => {
    e.preventDefault()
    if (draggedOrder && draggedOrder.status !== targetStatus) {
      updateOrderStatus(draggedOrder.id, targetStatus)
    }
    setDraggedOrder(null)
    setIsDragging(false)
  }

  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }))
  }

  const visibleStatusColumns = statusColumns.filter((column) => visibleColumns[column.id])

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="auto-accept" className="text-sm font-medium">
              Aceite Automático
            </label>
            <Switch id="auto-accept" checked={autoAccept} onCheckedChange={setAutoAccept} />
          </div>

          <Button
            variant={soundEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
        </div>

        <div className="text-sm text-gray-600">Tempo médio: 25 min | Pedidos hoje: {orders.length}</div>
      </div>

      {showFilters && (
        <Card className="p-3">
          <h3 className="font-semibold mb-2 text-sm">Colunas Visíveis</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {statusColumns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={visibleColumns[column.id]}
                  onCheckedChange={() => toggleColumnVisibility(column.id)}
                />
                <label htmlFor={column.id} className="text-sm font-medium">
                  {column.title}
                </label>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Layout Kanban - Melhorando para preencher melhor a tela */}
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: "calc(100vh - 200px)" }}>
        {visibleStatusColumns.map((column) => (
          <div
            key={column.id}
            className={`flex-shrink-0 transition-all duration-200 ${isDragging ? "scale-[1.02]" : ""}`}
            style={{ width: "280px" }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id as Order["status"])}
          >
            <div className="bg-white rounded-lg shadow-sm border h-full">
              <div className={`${column.color} text-white p-2 rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                    {getOrdersByStatus(column.id).length}
                  </Badge>
                </div>
              </div>

              <div className="p-2 space-y-2" style={{ minHeight: "calc(100vh - 280px)" }}>
                {getOrdersByStatus(column.id).map((order) => (
                  <Card
                    key={order.id}
                    className={`hover:shadow-md transition-all duration-200 cursor-move ${
                      draggedOrder?.id === order.id ? "opacity-50 scale-95" : ""
                    } ${isDragging && draggedOrder?.id !== order.id ? "scale-98" : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order)}
                    onDragEnd={handleDragEnd}
                  >
                    <CardHeader className="pb-1 pt-2 px-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">#{order.number}</CardTitle>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="w-3 h-3" />
                          {Math.floor((Date.now() - order.createdAt.getTime()) / 60000)} min
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-1.5 px-2 pb-2">
                      <div>
                        <p className="font-medium text-sm">{order.customerName}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          {order.type === "delivery" ? <Truck className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                          {order.type === "delivery" ? "Delivery" : "Retirada"}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        {order.items.slice(0, 2).map((item) => (
                          <div key={item.id} className="text-xs">
                            <span className="font-medium">
                              {item.quantity}x {item.name}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <div className="text-xs text-gray-500">+{order.items.length - 2} itens...</div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs">
                        <CreditCard className="w-3 h-3" />
                        {order.paymentMethod}
                      </div>

                      {order.observations && (
                        <div className="text-xs text-gray-600 bg-yellow-50 p-1 rounded">
                          <strong>Obs:</strong> {order.observations.slice(0, 25)}...
                        </div>
                      )}

                      <div className="flex gap-1 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                          className="flex-1 h-6 text-xs"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => printOrder(order)} className="h-6">
                          <Printer className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="flex gap-1">
                        {column.id === "novo" && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, "preparando")}
                            className="flex-1 bg-yellow-500 hover:bg-yellow-600 h-6 text-xs"
                          >
                            Iniciar Preparo
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                        {column.id === "preparando" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, "novo")}
                              className="h-6"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, "pronto")}
                              className="flex-1 bg-green-500 hover:bg-green-600 h-6 text-xs"
                            >
                              Finalizar
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </>
                        )}
                        {column.id === "pronto" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, "preparando")}
                              className="h-6"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                updateOrderStatus(order.id, order.type === "delivery" ? "em_entrega" : "concluido")
                              }
                              className="flex-1 bg-purple-500 hover:bg-purple-600 h-6 text-xs"
                            >
                              {order.type === "delivery" ? "Enviar" : "Entregar"}
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </>
                        )}
                        {column.id === "em_entrega" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, "pronto")}
                              className="h-6"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, "concluido")}
                              className="flex-1 bg-gray-500 hover:bg-gray-600 h-6 text-xs"
                            >
                              Concluir
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {getOrdersByStatus(column.id).length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">Nenhum pedido</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Ver Pedido - formato cupom térmico */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pedido #{selectedOrder?.number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 font-mono text-sm">
              <div className="text-center border-b pb-2">
                <div className="font-bold">ANA FOOD</div>
                <div className="text-xs">Rua Principal, 456</div>
                <div className="text-xs">Tel: (11) 99999-9999</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Pedido:</span>
                  <span>#{selectedOrder.number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span>{selectedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span>{selectedOrder.type === "delivery" ? "Delivery" : "Retirada"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagamento:</span>
                  <span>{selectedOrder.paymentMethod}</span>
                </div>
              </div>

              <div className="border-t pt-2">
                <div className="font-bold mb-2">ITENS:</div>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    {item.complements.map((complement) => (
                      <div key={complement} className="text-xs ml-4">
                        + {complement}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {selectedOrder.address && (
                <div className="border-t pt-2">
                  <div className="font-bold">ENDEREÇO:</div>
                  <div className="text-xs">{selectedOrder.address}</div>
                </div>
              )}

              {selectedOrder.observations && (
                <div className="border-t pt-2">
                  <div className="font-bold">OBSERVAÇÕES:</div>
                  <div className="text-xs">{selectedOrder.observations}</div>
                </div>
              )}

              <div className="border-t pt-2 text-center">
                <div className="font-bold">
                  TOTAL: R$ {selectedOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
