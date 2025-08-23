"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, MapPin, Calculator, Map } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface DeliveryFee {
  id: string
  neighborhood: string
  fee: number
  active: boolean
}

interface DeliveryZone {
  id: string
  zone_name: string
  fee: number
  polygon_coordinates?: string
  active: boolean
}

interface DeliveryDistanceRange {
  id: string
  min_distance: number
  max_distance: number
  fee: number
  active: boolean
}

interface DeliverySettings {
  delivery_mode: "neighborhoods" | "distance" | "zones"
  base_location?: string
}

export function DeliveryConfigScreen({ user }: { user: any }) {
  const [deliveryMode, setDeliveryMode] = useState<"neighborhoods" | "distance" | "zones">("neighborhoods")
  const [neighborhoods, setNeighborhoods] = useState<DeliveryFee[]>([])
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [distanceRanges, setDistanceRanges] = useState<DeliveryDistanceRange[]>([])
  const [baseLocation, setBaseLocation] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form states
  const [newNeighborhood, setNewNeighborhood] = useState({ name: "", fee: "" })
  const [newZone, setNewZone] = useState({ name: "", fee: "" })
  const [newRange, setNewRange] = useState({ min: "", max: "", fee: "" })
  const [editingItem, setEditingItem] = useState<any>(null)

  useEffect(() => {
    loadDeliveryConfig()
  }, [])

  const loadDeliveryConfig = async () => {
    try {
      console.log("[v0] DeliveryConfig: Carregando configurações...")
      setLoading(true)

      const headers = { "x-user-email": user.email }

      // Load delivery settings
      const settingsResponse = await fetch("/api/delivery-settings", { headers })
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json()
        if (settings) {
          setDeliveryMode(settings.delivery_mode || "neighborhoods")
          setBaseLocation(settings.base_location || "")
        }
      }

      // Load neighborhoods
      const neighborhoodsResponse = await fetch("/api/delivery-fees", { headers })
      if (neighborhoodsResponse.ok) {
        const data = await neighborhoodsResponse.json()
        setNeighborhoods(data || [])
      }

      // Load zones
      const zonesResponse = await fetch("/api/delivery-zones", { headers })
      if (zonesResponse.ok) {
        const data = await zonesResponse.json()
        setZones(data || [])
      }

      // Load distance ranges
      const rangesResponse = await fetch("/api/delivery-distance-ranges", { headers })
      if (rangesResponse.ok) {
        const data = await rangesResponse.json()
        setDistanceRanges(data || [])
      }

      console.log("[v0] DeliveryConfig: Configurações carregadas")
    } catch (error) {
      console.error("[v0] DeliveryConfig: Erro ao carregar:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações de entrega",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveDeliveryMode = async (mode: "neighborhoods" | "distance" | "zones") => {
    try {
      setSaving(true)
      const response = await fetch("/api/delivery-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email,
        },
        body: JSON.stringify({
          delivery_mode: mode,
          base_location: baseLocation,
        }),
      })

      if (response.ok) {
        setDeliveryMode(mode)
        toast({
          title: "Sucesso",
          description: "Modo de entrega atualizado",
        })
      } else {
        throw new Error("Failed to save delivery mode")
      }
    } catch (error) {
      console.error("[v0] DeliveryConfig: Erro ao salvar modo:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar modo de entrega",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addNeighborhood = async () => {
    if (!newNeighborhood.name.trim() || !newNeighborhood.fee) return

    try {
      const response = await fetch("/api/delivery-fees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email,
        },
        body: JSON.stringify({
          neighborhood: newNeighborhood.name.trim(),
          fee: Number.parseFloat(newNeighborhood.fee),
        }),
      })

      if (response.ok) {
        const newItem = await response.json()
        setNeighborhoods([...neighborhoods, newItem])
        setNewNeighborhood({ name: "", fee: "" })
        toast({
          title: "Sucesso",
          description: "Bairro adicionado",
        })
      }
    } catch (error) {
      console.error("[v0] DeliveryConfig: Erro ao adicionar bairro:", error)
      toast({
        title: "Erro",
        description: "Erro ao adicionar bairro",
        variant: "destructive",
      })
    }
  }

  const toggleNeighborhoodStatus = async (id: string, active: boolean) => {
    try {
      const response = await fetch("/api/delivery-fees", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email,
        },
        body: JSON.stringify({ id, active }),
      })

      if (response.ok) {
        setNeighborhoods(neighborhoods.map((n) => (n.id === id ? { ...n, active } : n)))
        toast({
          title: "Sucesso",
          description: `Bairro ${active ? "ativado" : "desativado"}`,
        })
      }
    } catch (error) {
      console.error("[v0] DeliveryConfig: Erro ao alterar status:", error)
      toast({
        title: "Erro",
        description: "Erro ao alterar status do bairro",
        variant: "destructive",
      })
    }
  }

  const deleteNeighborhood = async (id: string) => {
    try {
      const response = await fetch(`/api/delivery-fees?id=${id}`, {
        method: "DELETE",
        headers: { "x-user-email": user.email },
      })

      if (response.ok) {
        setNeighborhoods(neighborhoods.filter((n) => n.id !== id))
        toast({
          title: "Sucesso",
          description: "Bairro excluído",
        })
      }
    } catch (error) {
      console.error("[v0] DeliveryConfig: Erro ao excluir bairro:", error)
      toast({
        title: "Erro",
        description: "Erro ao excluir bairro",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando configurações de entrega...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configurações de Entrega</h2>
        <p className="text-muted-foreground">Configure como deseja cobrar as taxas de entrega</p>
      </div>

      {/* Delivery Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Modo de Entrega</CardTitle>
          <CardDescription>Escolha apenas um modo de entrega ativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              className={`cursor-pointer transition-all ${deliveryMode === "neighborhoods" ? "ring-2 ring-primary" : ""}`}
            >
              <CardContent className="p-4 text-center" onClick={() => saveDeliveryMode("neighborhoods")}>
                <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Por Bairros</h3>
                <p className="text-sm text-muted-foreground">Cadastro manual de bairros</p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${deliveryMode === "distance" ? "ring-2 ring-primary" : ""}`}
            >
              <CardContent className="p-4 text-center" onClick={() => saveDeliveryMode("distance")}>
                <Calculator className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Por Distância</h3>
                <p className="text-sm text-muted-foreground">Cálculo automático por km</p>
              </CardContent>
            </Card>

            <Card className={`cursor-pointer transition-all ${deliveryMode === "zones" ? "ring-2 ring-primary" : ""}`}>
              <CardContent className="p-4 text-center" onClick={() => saveDeliveryMode("zones")}>
                <Map className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Por Zonas</h3>
                <p className="text-sm text-muted-foreground">Áreas específicas no mapa</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Neighborhoods Mode */}
      {deliveryMode === "neighborhoods" && (
        <Card>
          <CardHeader>
            <CardTitle>Entrega por Bairros</CardTitle>
            <CardDescription>Cadastre os bairros atendidos e suas respectivas taxas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new neighborhood */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome do bairro"
                value={newNeighborhood.name}
                onChange={(e) => setNewNeighborhood({ ...newNeighborhood, name: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Taxa (R$)"
                value={newNeighborhood.fee}
                onChange={(e) => setNewNeighborhood({ ...newNeighborhood, fee: e.target.value })}
              />
              <Button onClick={addNeighborhood}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {/* Neighborhoods list */}
            <div className="space-y-2">
              {neighborhoods.map((neighborhood) => (
                <div key={neighborhood.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{neighborhood.neighborhood}</span>
                    <Badge variant={neighborhood.active ? "default" : "secondary"}>
                      R$ {neighborhood.fee.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={neighborhood.active}
                      onCheckedChange={(checked) => toggleNeighborhoodStatus(neighborhood.id, checked)}
                    />
                    <Button variant="ghost" size="sm" onClick={() => deleteNeighborhood(neighborhood.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distance Mode */}
      {deliveryMode === "distance" && (
        <Card>
          <CardHeader>
            <CardTitle>Entrega por Distância</CardTitle>
            <CardDescription>Configure faixas de distância com taxas diferentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="baseLocation">Localização Base (Link do Google Maps)</Label>
              <Input
                id="baseLocation"
                placeholder="Cole o link do Google Maps da sua localização"
                value={baseLocation}
                onChange={(e) => setBaseLocation(e.target.value)}
              />
            </div>

            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4" />
              <p>Funcionalidade em desenvolvimento</p>
              <p className="text-sm">Cálculo automático de distância por API</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zones Mode */}
      {deliveryMode === "zones" && (
        <Card>
          <CardHeader>
            <CardTitle>Entrega por Zonas</CardTitle>
            <CardDescription>Defina zonas específicas de entrega no mapa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Map className="h-12 w-12 mx-auto mb-4" />
              <p>Funcionalidade em desenvolvimento</p>
              <p className="text-sm">Desenho de zonas no mapa interativo</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
