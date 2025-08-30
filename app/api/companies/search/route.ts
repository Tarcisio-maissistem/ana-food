import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/[^\d]/g, "")
}

export async function POST(request: NextRequest) {
  try {
    const { cnpj } = await request.json()

    if (!cnpj) {
      console.log("[v0] API: CNPJ não fornecido")
      return NextResponse.json({ error: "CNPJ é obrigatório" }, { status: 400 })
    }

    console.log("[v0] API: Buscando empresa com CNPJ:", cnpj)

    const normalizedInputCNPJ = normalizeCNPJ(cnpj)
    console.log("[v0] API: CNPJ normalizado para busca:", normalizedInputCNPJ)

    const { data: companies, error } = await supabase
      .from("companies")
      .select("*")
      .or(`cnpj.eq.${cnpj},cnpj.eq.${normalizedInputCNPJ}`)

    if (error) {
      console.error("[v0] API: Erro na consulta Supabase:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    if (!companies || companies.length === 0) {
      console.log("[v0] API: Nenhuma empresa encontrada com busca exata, tentando busca flexível...")

      const { data: allCompanies, error: allError } = await supabase.from("companies").select("*")

      if (allError) {
        console.error("[v0] API: Erro na consulta flexível:", allError)
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
      }

      const matchingCompanies =
        allCompanies?.filter((company) => {
          if (!company.cnpj) return false
          const normalizedStoredCNPJ = normalizeCNPJ(company.cnpj)
          const match = normalizedStoredCNPJ === normalizedInputCNPJ
          console.log(`[v0] API: Comparando ${normalizedStoredCNPJ} com ${normalizedInputCNPJ}: ${match}`)
          return match
        }) || []

      if (matchingCompanies.length === 0) {
        console.log("[v0] API: Nenhuma empresa encontrada após busca flexível")
        return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
      }

      console.log("[v0] API: Empresa encontrada com busca flexível:", matchingCompanies[0])
      return NextResponse.json({ company: matchingCompanies[0] })
    }

    console.log("[v0] API: Empresa encontrada:", companies[0])
    return NextResponse.json({ company: companies[0] })
  } catch (error) {
    console.error("[v0] API: Erro inesperado:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
