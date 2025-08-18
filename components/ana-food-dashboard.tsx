"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import {
  Clock,
  MapPin,
  CreditCard,
  Printer,
  Eye,
  Search,
  Filter,
  Bell,
  BellOff,
  ChevronRight,
  ChevronLeft,
  Settings,
  Package,
  Truck,
} from "lucide-react"
import { toast } from "react-hot-toast"

// Tipos de dados
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
  status: "novo" | "preparando" | "pronto" | "entregue"
  type: "delivery" | "retirada"
  createdAt: Date
  estimatedTime?: number
}

// Dados para relatórios
const paymentData = [
  { name: "PIX", value: 45, color: "#10B981" },
  { name: "Cartão", value: 35, color: "#3B82F6" },
  { name: "Dinheiro", value: 20, color: "#F59E0B" },
]

const dailyOrders = [
  { time: "08:00", orders: 5 },
  { time: "10:00", orders: 12 },
  { time: "12:00", orders: 25 },
  { time: "14:00", orders: 18 },
  { time: "16:00", orders: 8 },
  { time: "18:00", orders: 22 },
  { time: "20:00", orders: 15 },
]

export function AnaFoodDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [searchTerm, setSearchTerm] = useState("")
  const [autoAccept, setAutoAccept] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/orders")
      if (response.ok) {
        const data = await response.json()
        setOrders(Array.isArray(data) ? data : [])
      } else {
        console.error("Erro ao carregar pedidos")
        toast.error("Erro ao carregar pedidos")
      }
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error)
      toast.error("Erro ao carregar pedidos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) {
        const newOrder: Order = {
          id: Date.now().toString(),
          number: 1000 + orders.length + 1,
          customerName: `Cliente ${orders.length + 1}`,
          items: [{ id: Date.now().toString(), name: "Produto Teste", quantity: 1, price: 20.0, complements: [] }],
          paymentMethod: "PIX",
          status: "novo",
          type: Math.random() > 0.5 ? "delivery" : "retirada",
          createdAt: new Date(),
          estimatedTime: 25,
        }

        setOrders((prev) => [newOrder, ...prev])

        if (soundEnabled) {
          playNotificationSound(newOrder.type)
        }
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [orders.length, soundEnabled])

  useEffect(() => {
    let filtered = orders

    if (statusFilter !== "todos") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.number.toString().includes(searchTerm),
      )
    }

    setFilteredOrders(filtered)
  }, [orders, statusFilter, searchTerm])

  const playNotificationSound = (type: "delivery" | "retirada") => {
    console.log(`🔊 Som de ${type === "delivery" ? "delivery" : "retirada"}`)
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      })

      if (response.ok) {
        setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)))
        toast.success("Status atualizado com sucesso")
      } else {
        toast.error("Erro ao atualizar status")
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      toast.error("Erro ao atualizar status")
    }
  }

  const printOrder = (order: Order) => {
    console.log("🖨️ Imprimindo pedido:", order.number)
  }

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "novo":
        return "bg-blue-500"
      case "preparando":
        return "bg-yellow-500"
      case "pronto":
        return "bg-green-500"
      case "entregue":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "novo":
        return "Novo"
      case "preparando":
        return "Preparando"
      case "pronto":
        return "Pronto"
      case "entregue":
        return "Entregue"
      default:
        return status
    }
  }

  const getNextStatus = (currentStatus: Order["status"]): Order["status"] | null => {
    switch (currentStatus) {
      case "novo":
        return "preparando"
      case "preparando":
        return "pronto"
      case "pronto":
        return "entregue"
      default:
        return null
    }
  }

  const getPreviousStatus = (currentStatus: Order["status"]): Order["status"] | null => {
    switch (currentStatus) {
      case "preparando":
        return "novo"
      case "pronto":
        return "preparando"
      case "entregue":
        return "pronto"
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Ana Food</h1>
          <div className="flex items-center gap-4">
            <Button
              variant={soundEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="novo">Novos</SelectItem>
                  <SelectItem value="preparando">Preparando</SelectItem>
                  <SelectItem value="pronto">Prontos</SelectItem>
                  <SelectItem value="entregue">Entregues</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="auto-accept" className="text-sm font-medium">
                Aceite Automático
              </label>
              <Switch id="auto-accept" checked={autoAccept} onCheckedChange={setAutoAccept} />
            </div>

            <div className="text-sm text-gray-600">Tempo médio: 25 min</div>
          </div>

          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <Input
              placeholder="Buscar por cliente ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="pedidos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Carregando pedidos...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">#{order.number}</CardTitle>
                        <Badge className={`${getStatusColor(order.status)} text-white`}>
                          {getStatusText(order.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {Math.floor((Date.now() - order.createdAt.getTime()) / 60000)} min atrás
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div>
                        <p className="font-semibold">{order.customerName}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          {order.type === "delivery" ? <Truck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                          {order.type === "delivery" ? "Delivery" : "Retirada"}
                        </div>
                      </div>

                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="text-sm">
                            <span className="font-medium">
                              {item.quantity}x {item.name}
                            </span>
                            {item.complements.length > 0 && (
                              <p className="text-gray-600 text-xs ml-2">+ {item.complements.join(", ")}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4" />
                        {order.paymentMethod}
                      </div>

                      {order.address && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{order.address}</span>
                        </div>
                      )}

                      {order.observations && (
                        <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                          <strong>Obs:</strong> {order.observations}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)} className="flex-1">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => printOrder(order)}>
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        {getPreviousStatus(order.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, getPreviousStatus(order.status)!)}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                        )}
                        {getNextStatus(order.status) && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                            className="flex-1"
                          >
                            {getStatusText(getNextStatus(order.status)!)}
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredOrders.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhum pedido encontrado</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="relatorios">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Formas de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {paymentData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pedidos por Horário</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyOrders}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Resumo do Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">127</div>
                    <div className="text-sm text-gray-600">Total de Pedidos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">R$ 2.847,50</div>
                    <div className="text-sm text-gray-600">Faturamento</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">23 min</div>
                    <div className="text-sm text-gray-600">Tempo Médio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">4.8</div>
                    <div className="text-sm text-gray-600">Avaliação Média</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
