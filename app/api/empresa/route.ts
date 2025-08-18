import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Variáveis de ambiente do Supabase não configuradas")
}

const supabase = createClient(supabaseUrl!, supabaseKey!)

export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    console.log("[v0] API Empresa: Buscando empresa para usuário:", userEmail)

    let userId = null
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle()

      if (userError) {
        console.error("[v0] API Empresa: Erro ao buscar usuário:", userError)
      } else if (userData) {
        userId = userData.id
        console.log("[v0] API Empresa: Usuário encontrado:", userId)
      }
    } catch (error) {
      console.log("[v0] API Empresa: Tabela users não existe ou erro na consulta")
    }

    const { error: tableError } = await supabase.from("companies").select("count").limit(1)

    if (
      tableError &&
      (tableError.message.includes("does not exist") ||
        tableError.message.includes("relation") ||
        tableError.message.includes("schema cache"))
    ) {
      console.log("Tabela 'companies' não existe, retornando dados vazios")
      return NextResponse.json({
        cnpj: "",
        name: "",
        phone: "",
        address: "",
        working_hours: "08:00 - 18:00",
        delivery_time: "30-45 min",
        minimum_order: 0,
        notes: "",
        location_link: "",
      })
    }

    let query = supabase.from("companies").select("*")

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error("Erro ao buscar empresa:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      console.log("[v0] API Empresa: Nenhuma empresa encontrada, retornando dados vazios")
      return NextResponse.json({
        cnpj: "",
        name: "",
        phone: "",
        address: "",
        working_hours: "08:00 - 18:00",
        delivery_time: "30-45 min",
        minimum_order: 0,
        notes: "",
        location_link: "",
      })
    }

    console.log("[v0] API Empresa: Empresa encontrada:", data.name)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    console.log("Dados recebidos para atualização:", body)

    const { data: tableCheck, error: tableError } = await supabase.from("companies").select("count").limit(1)

    if (tableError) {
      console.error("Erro ao verificar tabela companies:", tableError)
      return NextResponse.json(
        {
          error: "Tabela 'companies' não encontrada no banco de dados",
          details: tableError.message,
          suggestion: "Verifique se a tabela 'companies' existe no Supabase",
        },
        { status: 500 },
      )
    }

    const companyData = {
      name: body.nome || body.name || "",
      cnpj: body.cnpj || "",
      phone: body.telefone || body.phone || "",
      address: body.endereco || body.address || "",
      working_hours: body.working_hours || "08:00 - 18:00",
      delivery_time: body.delivery_time || "30-45 min",
      minimum_order: body.minimum_order || 0,
      notes: body.notes || "",
      location_link: body.location_link || "",
      updated_at: new Date().toISOString(),
    }

    const { data: existingData, error: searchError } = await supabase
      .from("companies")
      .select("id")
      .eq("cnpj", body.cnpj)
      .maybeSingle()

    if (searchError && searchError.code !== "PGRST116") {
      console.error("Erro ao buscar empresa existente:", searchError)
      return NextResponse.json(
        {
          error: "Erro ao verificar empresa existente",
          details: searchError.message,
          code: searchError.code,
        },
        { status: 500 },
      )
    }

    let result
    if (existingData) {
      console.log("Empresa existe, fazendo update...")
      const { data, error } = await supabase
        .from("companies")
        .update(companyData)
        .eq("cnpj", body.cnpj)
        .select()
        .single()

      if (error) {
        console.error("Erro detalhado ao fazer update:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        return NextResponse.json(
          {
            error: error.message || "Erro ao atualizar empresa",
            details: error.details || "Sem detalhes",
            hint: error.hint || "Sem dica",
            code: error.code || "Sem código",
          },
          { status: 500 },
        )
      }
      result = data
    } else {
      console.log("Empresa não existe, fazendo insert...")
      const { data, error } = await supabase
        .from("companies")
        .insert({
          ...companyData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Erro detalhado ao fazer insert:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          data: companyData,
        })
        return NextResponse.json(
          {
            error: error.message || "Erro ao criar empresa",
            details: error.details || "Sem detalhes",
            hint: error.hint || "Sem dica",
            code: error.code || "Sem código",
            sentData: companyData,
          },
          { status: 500 },
        )
      }
      result = data
    }

    console.log("Operação realizada com sucesso:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Erro interno completo:", error)
    const errorDetails = {
      error: "Erro interno do servidor",
      message: error instanceof Error ? error.message : "Erro desconhecido",
      name: error instanceof Error ? error.name : "UnknownError",
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined,
    }

    return NextResponse.json(errorDetails, { status: 500 })
  }
}
