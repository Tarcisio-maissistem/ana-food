"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, AlertCircle, CheckCircle } from "lucide-react"

const CertificateInstaller = () => {
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleInstall = async () => {
    setInstalling(true)
    setError(null)
    setSuccess(false)

    try {
      console.log("[v0] Iniciando download do certificado compartilhado...")

      const response = await fetch("/api/qz/certificate", {
        method: "GET",
        headers: {
          Accept: "application/octet-stream",
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Erro ao baixar certificado: ${response.status} - ${response.statusText}`)
      }

      const blob = await response.blob()

      // Criar link para download
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = "qz-shared-cert.p12"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      setSuccess(true)
      console.log("[v0] Certificado baixado com sucesso")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError("Erro ao baixar o certificado: " + errorMessage)
      console.error("[v0] Erro no download do certificado:", err)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Certificado QZ Tray Compartilhado
        </CardTitle>
        <CardDescription>Instale o certificado compartilhado para impressão automática sem popups</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleInstall} disabled={installing} className="w-full">
          {installing ? "Baixando..." : "Baixar e Instalar Certificado"}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Certificado baixado!</strong> Siga os passos abaixo para instalar:
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-gray-50 p-4 rounded-lg text-sm">
          <h4 className="font-semibold mb-2">Instruções de Instalação:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Abra o QZ Tray (ícone na bandeja do sistema)</li>
            <li>Clique no ícone de engrenagem (Preferences)</li>
            <li>Vá para a aba "Security"</li>
            <li>Clique em "Import" e selecione o arquivo baixado</li>
            <li>
              Use a senha: <code className="bg-gray-200 px-1 rounded">qztray</code>
            </li>
            <li>Clique em "OK" e reinicie o QZ Tray</li>
          </ol>

          <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
            <p className="text-blue-800">
              <strong>Importante:</strong> Você só precisa instalar este certificado uma vez por computador. Após a
              instalação, todas as impressões serão enviadas automaticamente.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CertificateInstaller
