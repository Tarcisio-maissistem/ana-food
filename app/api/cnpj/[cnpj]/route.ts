import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { cnpj: string } }) {
  try {
    const cnpj = params.cnpj.replace(/\D/g, "")

    if (cnpj.length !== 14) {
      return NextResponse.json({ error: "CNPJ deve ter 14 dígitos" }, { status: 400 })
    }

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: {
        "User-Agent": "Ana Food App",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "CNPJ não encontrado" }, { status: 404 })
      }
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()

    const mappedData = {
      status: "OK",
      nome: data.razao_social || "",
      fantasia: data.nome_fantasia || data.razao_social || "",
      logradouro: data.logradouro || "",
      numero: data.numero || "",
      complemento: data.complemento || "",
      bairro: data.bairro || "",
      municipio: data.municipio || "",
      uf: data.uf || "",
      cep: data.cep || "",
      situacao: data.situacao_cadastral || "",
      cnae_fiscal: data.cnae_fiscal_principal?.codigo || "",
    }

    return NextResponse.json(mappedData)
  } catch (error) {
    console.error("Erro ao consultar CNPJ:", error)
    return NextResponse.json({ error: "Erro ao consultar CNPJ. Tente novamente." }, { status: 500 })
  }
}
