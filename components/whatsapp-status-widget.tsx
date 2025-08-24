"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Wifi, WifiOff, RotateCcw } from "lucide-react"

type WhatsAppStatus = "connected" | "connecting" | "disconnected"

interface WhatsAppStatusWidgetProps {
  onReconnect?: () => void
  onConnectionError?: () => void
}

export function WhatsAppStatusWidget({ onReconnect, onConnectionError }: WhatsAppStatusWidgetProps) {
  const [status, setStatus] = useState<WhatsAppStatus>("disconnected")
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [retryCount, setRetryCount] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const maxRetries = 3

  useEffect(() => {
    const checkStatus = async () => {
      if (isChecking) {
        console.log("Verificação já em andamento, pulando...")
        return
      }

      try {
        setIsChecking(true)

        const empresaData = localStorage.getItem("empresa-data")
        let instanceName = "ana-food-instance"

        if (empresaData) {
          try {
            const empresa = JSON.parse(empresaData)
            if (empresa.cnpj) {
              instanceName = `ana-food-instance-${empresa.cnpj.replace(/\D/g, "")}`
            }
          } catch (e) {
            console.log("Erro ao parsear dados da empresa:", e)
          }
        }

        const response = await fetch(`/api/whatsapp/status?instance=${instanceName}`)

        if (response.ok) {
          const data = await response.json()
          console.log("Status da conexão WhatsApp:", data)
          const connectionState = data.instance?.state || "close"

          if (connectionState === "open") {
            setStatus("connected")
          } else if (connectionState === "connecting") {
            setStatus("connecting")
          } else {
            setStatus("disconnected")
          }

          setRetryCount(0)
        } else if (response.status === 404) {
          console.log("Instância WhatsApp não existe ainda")
          setStatus("disconnected")
          setRetryCount(0)
        } else {
          console.log("Erro na resposta da API:", response.status)
          setStatus("disconnected")
          setRetryCount((prev) => prev + 1)
        }

        setLastUpdate(new Date())
      } catch (error) {
        console.error("Erro ao verificar status WhatsApp:", error)
        setStatus("disconnected")
        setRetryCount((prev) => prev + 1)
        setLastUpdate(new Date())
      } finally {
        setIsChecking(false)
      }
    }

    const startPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Verificar status imediatamente
      checkStatus()

      const getPollingInterval = () => {
        if (retryCount >= maxRetries) {
          return 300000 // 5 minutos se muitos erros
        } else if (retryCount > 0) {
          return Math.min(30000 * Math.pow(2, retryCount), 120000) // Max 2 minutos
        }
        return 30000 // 30 segundos normal
      }

      const interval = getPollingInterval()
      console.log(`Próxima verificação WhatsApp em ${interval / 1000}s (retry: ${retryCount})`)

      intervalRef.current = setInterval(checkStatus, interval)
    }

    startPolling()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [retryCount]) // Reagir a mudanças no retry count

  const canSendMessage = () => {
    return status === "connected"
  }

  useEffect(() => {
    // Adicionar função global para verificar status do WhatsApp
    ;(window as any).checkWhatsAppStatus = () => {
      if (!canSendMessage() && onConnectionError) {
        onConnectionError()
      }
      return canSendMessage()
    }
  }, [status, onConnectionError])

  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          color: "bg-green-500",
          icon: <MessageCircle className="h-4 w-4" />,
          text: "Conectado",
          description: "Enviando atualizações de pedidos normalmente",
          variant: "default" as const,
        }
      case "connecting":
        return {
          color: "bg-yellow-500",
          icon: <Wifi className="h-4 w-4 animate-pulse" />,
          text: "Conectando",
          description: "Aguardando conexão do WhatsApp",
          variant: "secondary" as const,
        }
      case "disconnected":
        return {
          color: "bg-red-500",
          icon: <WifiOff className="h-4 w-4" />,
          text: "Desconectado",
          description: retryCount >= maxRetries ? "Muitas tentativas falharam" : "WhatsApp não está conectado",
          variant: "destructive" as const,
        }
    }
  }

  const statusConfig = getStatusConfig()

  const handleReconnect = () => {
    setRetryCount(0)
    if (onReconnect) {
      onReconnect()
    }
  }

  return (
    <Card className="p-3 mb-px">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${statusConfig.color}`} />
            <div className="flex items-center gap-1 text-gray-600">
              {statusConfig.icon}
              <span className="font-medium">WhatsApp</span>
            </div>
          </div>

          <Badge variant={statusConfig.variant} className="text-xs">
            {statusConfig.text}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{lastUpdate.toLocaleTimeString()}</span>

          {status === "disconnected" && (
            <Button size="sm" variant="outline" onClick={handleReconnect} className="h-7 px-2 text-xs bg-transparent">
              <RotateCcw className="h-3 w-3 mr-1" />
              Reconectar
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
