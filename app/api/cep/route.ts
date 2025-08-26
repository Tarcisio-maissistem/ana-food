import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cep = searchParams.get("cep")

    if (!cep) {
      return NextResponse.json({ error: "CEP é obrigatório" }, { status: 400 })
    }

    const cleanCEP = cep.replace(/\D/g, "")

    if (cleanCEP.length !== 8) {
      return NextResponse.json({ error: "CEP deve ter 8 dígitos" }, { status: 400 })
    }

    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)
    const data = await response.json()

    if (data.erro) {
      return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      cep: data.cep,
      logradouro: data.logradouro,
      complemento: data.complemento,
      bairro: data.bairro,
      localidade: data.localidade,
      uf: data.uf,
      ibge: data.ibge,
      gia: data.gia,
      ddd: data.ddd,
      siafi: data.siafi,
    })
  } catch (error) {
    console.error("[v0] CEP API: Erro ao consultar CEP:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
