"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Download, Shield, CheckCircle, AlertTriangle, Info } from "lucide-react"

interface CertificateDownloaderProps {
  companyId: string
  companyName?: string
  onCertificateInstalled?: (companyId: string) => void
}

const CertificateDownloader: React.FC<CertificateDownloaderProps> = ({
  companyId,
  companyName,
  onCertificateInstalled,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [companyCnpj, setCompanyCnpj] = useState<string>("")

  useEffect(() => {
    const getCompanyCnpj = () => {
      let cnpj = companyId

      if (!cnpj) {
        const storedCompany = localStorage.getItem("selectedCompany")
        if (storedCompany) {
          try {
            const company = JSON.parse(storedCompany)
            cnpj = company.cnpj || company.id || ""
          } catch (e) {
            console.warn("[v0] Erro ao parsear empresa do localStorage:", e)
          }
        }
      }

      if (!cnpj) {
        const userData = localStorage.getItem("userData")
        if (userData) {
          try {
            const user = JSON.parse(userData)
            cnpj = user.cnpj || user.company_cnpj || ""
          } catch (e) {
            console.warn("[v0] Erro ao parsear dados do usuário:", e)
          }
        }
      }

      console.log("[v0] CNPJ da empresa obtido:", cnpj)
      setCompanyCnpj(cnpj)
    }

    getCompanyCnpj()
  }, [companyId])

  const handleDownload = async () => {
    if (!companyCnpj) {
      setError("CNPJ da empresa não encontrado. Verifique se a empresa está selecionada corretamente.")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)
    setDownloadProgress(0)

    try {
      console.log("[v0] Iniciando download de certificado para empresa:", companyCnpj)

      setDownloadProgress(25)
      console.log("[v0] Solicitando token JWT...")

      const response = await fetch("/api/generate-cert-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cnpj: companyCnpj,
          company_id: companyCnpj,
        }),
      })

      console.log("[v0] Resposta da API de token:", response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.text()
        console.error("[v0] Erro na API de token:", errorData)
        throw new Error(`Falha ao gerar token: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      console.log("[v0] Token JWT obtido com sucesso")

      setDownloadProgress(50)

      const testUrl = `https://216.22.5.44:5050/health`
      try {
        const healthCheck = await fetch(testUrl, {
          method: "GET",
          mode: "cors",
          timeout: 5000,
        })
        console.log("[v0] Teste de conectividade:", healthCheck.status)
      } catch (healthError) {
        console.warn("[v0] Aviso: Servidor pode estar inacessível:", healthError)
      }

      const downloadUrl = `https://216.22.5.44:5050/download/${companyCnpj}?token=${data.token}`
      console.log("[v0] URL de download:", downloadUrl.replace(data.token, "[TOKEN_HIDDEN]"))

      setDownloadProgress(60)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      console.log("[v0] Iniciando download do certificado...")
      const certResponse = await fetch(downloadUrl, {
        signal: controller.signal,
        mode: "cors",
        headers: {
          Accept: "application/x-pkcs12,application/octet-stream,*/*",
        },
      })

      clearTimeout(timeoutId)
      console.log("[v0] Resposta do download:", certResponse.status, certResponse.headers.get("content-type"))

      if (!certResponse.ok) {
        const errorText = await certResponse.text()
        console.error("[v0] Erro no download:", certResponse.status, errorText)
        throw new Error(`Falha ao baixar certificado: ${certResponse.status} - ${errorText}`)
      }

      setDownloadProgress(75)

      console.log("[v0] Processando arquivo de certificado...")
      const blob = await certResponse.blob()
      console.log("[v0] Tamanho do arquivo:", blob.size, "bytes, tipo:", blob.type)

      if (blob.size === 0) {
        throw new Error("Arquivo de certificado está vazio")
      }

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${companyName || companyCnpj}-qztray-cert.p12`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setDownloadProgress(100)
      setSuccess(true)
      setShowInstructions(true)
      console.log("[v0] Download concluído com sucesso!")

      if (onCertificateInstalled) {
        onCertificateInstalled(companyCnpj)
      }
    } catch (err: any) {
      console.error("[v0] Erro completo no download:", err)

      let errorMessage = err.message
      if (err.name === "AbortError") {
        errorMessage = "Timeout: Download demorou mais que 30 segundos"
      } else if (err.message.includes("Failed to fetch")) {
        errorMessage = "Erro de conectividade: Verifique sua conexão com a internet e se o servidor está acessível"
      } else if (err.message.includes("CORS")) {
        errorMessage = "Erro de CORS: Problema de configuração do servidor"
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
      setTimeout(() => setDownloadProgress(0), 2000)
    }
  }

  const handleTestConnection = async () => {
    try {
      console.log("[v0] Testando conexão QZ Tray...")

      if (!window.qz) {
        alert("❌ QZ Tray não foi detectado. Certifique-se de que está instalado e a página foi recarregada.")
        return
      }

      if (!window.qz.websocket) {
        alert("❌ WebSocket do QZ Tray não está disponível.")
        return
      }

      const isActive = window.qz.websocket.isActive()
      console.log("[v0] QZ Tray ativo:", isActive)

      if (isActive) {
        alert("✅ QZ Tray está conectado e funcionando!")
      } else {
        try {
          await window.qz.websocket.connect()
          alert("✅ QZ Tray conectado com sucesso!")
        } catch (connectError) {
          console.error("[v0] Erro ao conectar QZ Tray:", connectError)
          alert("⚠️ QZ Tray detectado mas não conseguiu conectar. Verifique se está rodando corretamente.")
        }
      }
    } catch (error: any) {
      console.error("[v0] Erro no teste de conexão:", error)
      alert("❌ Erro ao testar conexão: " + error.message)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Certificado Digital QZ Tray</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-600">
            <strong>Empresa:</strong> {companyName || companyCnpj || "Não identificada"}
          </p>
          <p className="text-sm text-gray-600">
            <strong>CNPJ:</strong> {companyCnpj || "Não encontrado"}
          </p>
          {!companyCnpj && (
            <p className="text-sm text-red-600 mt-2">⚠️ CNPJ não encontrado. Selecione uma empresa primeiro.</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={loading || !companyCnpj}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              loading || !companyCnpj
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <Download className="w-4 h-4" />
            {loading ? "Baixando..." : "Baixar Certificado"}
          </button>

          <button
            onClick={handleTestConnection}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Testar QZ Tray
          </button>
        </div>

        {loading && downloadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            ></div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Erro ao baixar certificado</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-green-800 font-medium">Certificado baixado com sucesso!</p>
              <p className="text-green-700 text-sm">Agora siga as instruções abaixo para instalar no QZ Tray.</p>
            </div>
          </div>
        )}

        {(showInstructions || success) && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Instruções de Instalação</h4>
            </div>

            <div className="bg-blue-50 p-4 rounded-md">
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>
                  Certifique-se de que o <strong>QZ Tray está fechado</strong> completamente
                </li>
                <li>
                  Abra o <strong>QZ Tray</strong> (deve aparecer na bandeja do sistema)
                </li>
                <li>Clique com botão direito no ícone do QZ Tray na bandeja</li>
                <li>
                  Selecione <strong>"Advanced" → "Site Manager"</strong>
                </li>
                <li>
                  Clique em <strong>"Add Site"</strong>
                </li>
                <li>
                  Digite o domínio do seu sistema (ex: <code>meurestaurante.com</code>)
                </li>
                <li>
                  Clique em <strong>"Certificate"</strong> e selecione o arquivo baixado (.p12)
                </li>
                <li>
                  Insira a senha: <code className="bg-yellow-100 px-1 rounded">senha_padrao</code>
                </li>
                <li>
                  Clique em <strong>"Save"</strong> e feche o Site Manager
                </li>
                <li>
                  <strong>Reinicie o QZ Tray</strong> para aplicar as alterações
                </li>
              </ol>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Importante:</p>
                  <p className="text-yellow-700">
                    Após a instalação, teste a impressão para garantir que o certificado foi configurado corretamente.
                    Se houver problemas, verifique se o QZ Tray foi reiniciado e se o domínio está correto.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showInstructions ? "Ocultar" : "Mostrar"} instruções detalhadas
          </button>
        </div>
      </div>
    </div>
  )
}

export default CertificateDownloader
