"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Clock, Copy, ExternalLink } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface SubdomainConfigProps {
  user: {
    id: string
    email: string
    name: string
  }
}

interface CompanyData {
  id: string
  name: string
  subdomain: string
  custom_domain?: string
  domain_verified: boolean
  domain_verification_token?: string
}

export function SubdomainConfigScreen({ user }: SubdomainConfigProps) {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [subdomain, setSubdomain] = useState("")
  const [customDomain, setCustomDomain] = useState("")
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  useEffect(() => {
    loadCompanyData()
  }, [])

  const loadCompanyData = async () => {
    try {
      const response = await fetch("/api/companies", {
        headers: { "x-user-email": user.email },
      })

      if (response.ok) {
        const data = await response.json()
        setCompany(data)
        setSubdomain(data.subdomain || "")
        setCustomDomain(data.custom_domain || "")
      }
    } catch (error) {
      console.error("[v0] Error loading company data:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da empresa",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const checkSubdomainAvailability = async (value: string) => {
    if (!value || value === company?.subdomain) {
      setSubdomainAvailable(null)
      setSuggestions([])
      return
    }

    setCheckingAvailability(true)
    try {
      const response = await fetch(`/api/availability/subdomain?value=${encodeURIComponent(value)}`)
      const data = await response.json()

      setSubdomainAvailable(data.available)
      setSuggestions(data.suggestions || [])

      if (data.normalized !== value) {
        setSubdomain(data.normalized)
      }
    } catch (error) {
      console.error("[v0] Error checking subdomain availability:", error)
    } finally {
      setCheckingAvailability(false)
    }
  }

  const handleSubdomainChange = (value: string) => {
    setSubdomain(value)

    // Debounce availability check
    const timeoutId = setTimeout(() => {
      checkSubdomainAvailability(value)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/companies/subdomain", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email,
        },
        body: JSON.stringify({
          subdomain: subdomain,
          customDomain: customDomain || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCompany(data.company)
        toast({
          title: "Sucesso",
          description: "Configurações de domínio atualizadas com sucesso",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao salvar configurações",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error saving subdomain config:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: "Link copiado para a área de transferência",
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>
  }

  const subdomainUrl = `https://${subdomain}.anafood.vip`
  const customDomainUrl = customDomain ? `https://${customDomain}` : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configuração de Domínio</h2>
        <p className="text-muted-foreground">
          Configure o subdomínio e domínio personalizado para seu cardápio digital
        </p>
      </div>

      {/* Subdomain Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Subdomínio</CardTitle>
          <CardDescription>
            Seu cardápio ficará disponível em: <strong>{subdomain}.anafood.vip</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomínio</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                placeholder="meurestaurante"
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">.anafood.vip</span>
            </div>

            {checkingAvailability && <p className="text-sm text-muted-foreground">Verificando disponibilidade...</p>}

            {subdomainAvailable === true && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Subdomínio disponível</span>
              </div>
            )}

            {subdomainAvailable === false && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">Subdomínio não disponível</span>
                </div>

                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Sugestões disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <Button key={suggestion} variant="outline" size="sm" onClick={() => setSubdomain(suggestion)}>
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {company?.subdomain && (
            <div className="space-y-2">
              <Label>Link atual do cardápio</Label>
              <div className="flex items-center space-x-2 p-2 bg-muted rounded">
                <span className="flex-1 text-sm">{`https://${company.subdomain}.anafood.vip`}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`https://${company.subdomain}.anafood.vip`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://${company.subdomain}.anafood.vip`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Domain Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Domínio Personalizado</CardTitle>
          <CardDescription>Use seu próprio domínio para o cardápio (opcional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customDomain">Domínio personalizado</Label>
            <Input
              id="customDomain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="cardapio.meurestaurante.com.br"
            />
          </div>

          {company?.custom_domain && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {company.domain_verified ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verificado
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                )}
                <span className="text-sm">{company.custom_domain}</span>
              </div>

              {!company.domain_verified && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>
                        <strong>Para verificar seu domínio, adicione este registro DNS:</strong>
                      </p>
                      <div className="bg-muted p-2 rounded font-mono text-sm">
                        Tipo: TXT
                        <br />
                        Nome: _anafood-verification
                        <br />
                        Valor: {company.domain_verification_token}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Após adicionar o registro DNS, clique em "Verificar Domínio"
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || subdomainAvailable === false}>
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  )
}
