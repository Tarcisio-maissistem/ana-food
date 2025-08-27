"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, Printer, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { useRealtimeOrders } from "@/hooks/use-realtime-orders"
import { useQZTray } from "@/hooks/use-qz-tray"

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

export function OrdersRealtimeManager() {
  const [companyData, setCompanyData] = useState<{ cnpj: string; name: string } | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { toast } = useToast()

  const { orders, isSubscribed, connectionStatus, subscribeToOrders, unsubscribeFromOrders, updateOrderStatus } =
    useRealtimeOrders(companyData?.cnpj)

  const { isQZConnected, connectQZ, printOrder, qzStatus } = useQZTray()

  useEffect(() => {
    loadCompanyData()
  }, [])

  useEffect(() => {
    if (companyData?.cnpj && !isSubscribed) {
      subscribeToOrders()
      setIsConnected(true)
    }
  }, [companyData, isSubscribed, subscribeToOrders])

  useEffect(() => {
    const newOrders = orders.filter(
      (order) => order.status === "novo" && new Date(order.created_at).getTime() > Date.now() - 60000, // Last minute
    )

    newOrders.forEach((order) => {
      // Show notification
      toast({
        title: "🔔 Novo Pedido!",
        description: `Pedido #${order.numero_pedido} de ${order.nome_cliente}`,
        duration: 5000,
      })

      // Auto-print if QZ Tray is connected
      if (isQZConnected) {
        printOrder(order)
      }
    })
  }, [orders, isQZConnected, printOrder, toast])

  const loadCompanyData = async () => {
    try {
      const response = await fetch("/api/companies", {
        headers: {
          "X-User-Email": "tarcisiorp16@gmail.com", // Replace with actual user email
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.cnpj) {
          setCompanyData({
            cnpj: data.cnpj.replace(/\D/g, ""), // Clean CNPJ for subscription
            name: data.name || "Restaurante",
          })
          console.log("[v0] Orders Realtime: Company loaded:", data.name, data.cnpj)
        }
      }
    } catch (error) {
      console.error("[v0] Orders Realtime: Error loading company:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar dados da empresa",
        variant: "destructive",
      })
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: Order["status"]) => {
    try {
      await updateOrderStatus(orderId, newStatus)
      toast({
        title: "Status Atualizado",
        description: `Pedido atualizado para: ${getStatusLabel(newStatus)}`,
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido",
        variant: "destructive",
      })
    }
  }

  const getStatusLabel = (status: Order["status"]) => {
    const labels = {
      novo: "Novo",
      preparando: "Preparando",
      pronto: "Pronto",
      em_entrega: "Em Entrega",
      concluido: "Concluído",
      cancelado: "Cancelado",
    }
    return labels[status] || status
  }

  const getStatusColor = (status: Order["status"]) => {
    const colors = {
      novo: "bg-blue-500",
      preparando: "bg-yellow-500",
      pronto: "bg-green-500",
      em_entrega: "bg-purple-500",
      concluido: "bg-gray-500",
      cancelado: "bg-red-500",
    }
    return colors[status] || "bg-gray-500"
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos em Tempo Real</h1>
          <p className="text-muted-foreground">
            {companyData ? `${companyData.name} - CNPJ: ${companyData.cnpj}` : "Carregando..."}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Realtime Connection Status */}
          <div className="flex items-center gap-2">
            {isConnected && isSubscribed ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm">{isConnected && isSubscribed ? "Conectado" : "Desconectado"}</span>
          </div>

          {/* QZ Tray Status */}
          <div className="flex items-center gap-2">
            <Printer className={`h-5 w-5 ${isQZConnected ? "text-green-500" : "text-red-500"}`} />
            <span className="text-sm">{qzStatus}</span>
            {!isQZConnected && (
              <Button size="sm" onClick={connectQZ}>
                Conectar Impressora
              </Button>
            )}
          </div>

          {/* Manual refresh */}
          <Button variant="outline" size="sm" onClick={loadCompanyData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <Card key={order.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">#{order.numero_pedido}</CardTitle>
                <Badge className={`${getStatusColor(order.status)} text-white`}>{getStatusLabel(order.status)}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">{formatTime(order.created_at)}</div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Customer Info */}
              <div>
                <p className="font-medium">{order.nome_cliente}</p>
                <p className="text-sm text-muted-foreground">{order.telefone}</p>
                {order.endereco && <p className="text-sm text-muted-foreground">{order.endereco}</p>}
              </div>

              {/* Items */}
              <div>
                <p className="text-sm font-medium mb-2">Itens:</p>
                <div className="space-y-1">
                  {order.itens?.map((item, index) => (
                    <div key={index} className="text-sm flex justify-between">
                      <span>
                        {item.quantidade}x {item.nome}
                      </span>
                      <span>{formatCurrency(item.preco * item.quantidade)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment and Total */}
              <div className="border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Taxa Entrega:</span>
                  <span>{formatCurrency(order.taxa_entrega)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Pagamento: {order.pagamento}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                {order.status === "novo" && (
                  <Button size="sm" onClick={() => handleStatusUpdate(order.id, "preparando")}>
                    Aceitar
                  </Button>
                )}
                {order.status === "preparando" && (
                  <Button size="sm" onClick={() => handleStatusUpdate(order.id, "pronto")}>
                    Pronto
                  </Button>
                )}
                {order.status === "pronto" && (
                  <Button size="sm" onClick={() => handleStatusUpdate(order.id, "em_entrega")}>
                    Saiu p/ Entrega
                  </Button>
                )}
                {order.status === "em_entrega" && (
                  <Button size="sm" onClick={() => handleStatusUpdate(order.id, "concluido")}>
                    Concluir
                  </Button>
                )}

                {/* Print button */}
                <Button size="sm" variant="outline" onClick={() => printOrder(order)} disabled={!isQZConnected}>
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum pedido encontrado</h3>
          <p className="text-muted-foreground">Os novos pedidos aparecerão aqui automaticamente</p>
        </div>
      )}
    </div>
  )
}
