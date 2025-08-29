"use client"

import type React from "react"
import { useState } from "react"
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

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    setDownloadProgress(0)

    try {
      // Passo 1: Obter token do backend
      setDownloadProgress(25)
      const response = await fetch("/api/generate-cert-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`, // Se usar auth
        },
        body: JSON.stringify({ company_id: companyId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Falha ao gerar token de acesso")
      }

      setDownloadProgress(50)

      // Passo 2: Construir URL de download
      const downloadUrl = `https://216.22.5.44:5050/download/${companyId}?token=${data.token}`

      // Passo 3: Fazer download via fetch para controlar o processo
      const certResponse = await fetch(downloadUrl)

      if (!certResponse.ok) {
        throw new Error("Falha ao baixar certificado do servidor")
      }

      setDownloadProgress(75)

      // Passo 4: Criar blob e iniciar download
      const blob = await certResponse.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${companyName || companyId}-qztray-cert.p12`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setDownloadProgress(100)
      setSuccess(true)
      setShowInstructions(true)

      // Callback opcional para notificar o componente pai
      if (onCertificateInstalled) {
        onCertificateInstalled(companyId)
      }
    } catch (err: any) {
      setError(err.message)
      console.error("Erro ao baixar certificado:", err)
    } finally {
      setLoading(false)
      setTimeout(() => setDownloadProgress(0), 2000)
    }
  }

  const handleTestConnection = async () => {
    try {
      // Testar se o QZ Tray está rodando
      if (window.qz && window.qz.websocket) {
        const isActive = window.qz.websocket.isActive()
        if (isActive) {
          alert("✅ QZ Tray está conectado e funcionando!")
        } else {
          alert("⚠️ QZ Tray não está conectado. Verifique se está rodando.")
        }
      } else {
        alert("❌ QZ Tray não foi detectado. Certifique-se de que está instalado e rodando.")
      }
    } catch (error: any) {
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
        {/* Informações da empresa */}
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-600">
            <strong>Empresa:</strong> {companyName || companyId}
          </p>
          <p className="text-sm text-gray-600">
            <strong>ID:</strong> {companyId}
          </p>
        </div>

        {/* Botão de download */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              loading ? "bg-gray-400 cursor-not-allowed text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
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

        {/* Progress bar */}
        {loading && downloadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            ></div>
          </div>
        )}

        {/* Mensagens de status */}
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

        {/* Instruções de instalação */}
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

        {/* Link para instruções detalhadas */}
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
