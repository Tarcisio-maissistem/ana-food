import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get("X-User-Email") || "tarcisiorp16@gmail.com"
    console.log("[v0] API Companies: Buscando empresa para usuário:", userEmail)

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).maybeSingle()

    if (user) {
      console.log("[v0] API Companies: Usuário encontrado:", user.id)

      const { data: company, error } = await supabase.from("companies").select("*").eq("user_id", user.id).maybeSingle()

      if (!error && company) {
        console.log("[v0] API Companies: Empresa encontrada:", company.name)
        return NextResponse.json(company)
      } else {
        console.log("[v0] API Companies: Nenhuma empresa encontrada para o usuário")
      }
    }

    return NextResponse.json({
      name: "",
      razao_social: "",
      cnpj: "",
      cpf: "",
      phone: "",
      whatsapp: "",
      email: "",
      site: "",
      instagram: "",
      facebook: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      cep: "",
      horarios: {
        segunda: { abertura: "08:00", fechamento: "22:00", fechado: false },
        terca: { abertura: "08:00", fechamento: "22:00", fechado: false },
        quarta: { abertura: "08:00", fechamento: "22:00", fechado: false },
        quinta: { abertura: "08:00", fechamento: "22:00", fechado: false },
        sexta: { abertura: "08:00", fechamento: "22:00", fechado: false },
        sabado: { abertura: "08:00", fechamento: "22:00", fechado: false },
        domingo: { abertura: "08:00", fechamento: "22:00", fechado: true },
      },
      tempo_medio_preparo: "30",
      retirada_local: true,
      entrega_propria: true,
      entrega_motoboy: false,
      link_cardapio: "",
      logo_url: null,
      photos: [],
    })
  } catch (error) {
    console.error("[v0] API Companies: Erro:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userEmail = request.headers.get("X-User-Email") || "tarcisiorp16@gmail.com"
    const body = await request.json()
    console.log("[v0] API Companies: Salvando dados para usuário:", userEmail)
    console.log("[v0] API Companies: Dados recebidos:", Object.keys(body))

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).maybeSingle()

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const companyData = {
      name: body.name || "",
      razao_social: body.razao_social || "",
      cnpj: body.cnpj || "",
      cpf: body.cpf || "",
      phone: body.phone || "",
      whatsapp: body.whatsapp || "",
      email: body.email || "",
      site: body.site || "",
      instagram: body.instagram || "",
      facebook: body.facebook || "",
      rua: body.rua || "",
      numero: body.numero || "",
      complemento: body.complemento || "",
      bairro: body.bairro || "",
      cidade: body.cidade || "",
      uf: body.uf || "",
      cep: body.cep || "",
      horarios: body.horarios || {},
      tempo_medio_preparo: body.tempo_medio_preparo || "30",
      retirada_local: body.retirada_local !== false,
      entrega_propria: body.entrega_propria !== false,
      entrega_motoboy: body.entrega_motoboy || false,
      link_cardapio: body.link_cardapio || "",
      logo_url: body.logo_url || null,
      photos: body.photos || [],
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    const { data: existingCompany } = await supabase.from("companies").select("id").eq("user_id", user.id).maybeSingle()

    if (existingCompany) {
      const { data: company, error } = await supabase
        .from("companies")
        .update(companyData)
        .eq("user_id", user.id)
        .select()
        .maybeSingle()

      if (!error && company) {
        console.log("[v0] API Companies: Empresa atualizada com sucesso")
        return NextResponse.json(company)
      } else {
        console.error("[v0] API Companies: Erro ao atualizar:", error)
        return NextResponse.json({ error: "Erro ao atualizar empresa" }, { status: 500 })
      }
    } else {
      const { data: company, error } = await supabase
        .from("companies")
        .insert({
          ...companyData,
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle()

      if (!error && company) {
        console.log("[v0] API Companies: Empresa criada com sucesso")
        return NextResponse.json(company)
      } else {
        console.error("[v0] API Companies: Erro ao criar:", error)
        return NextResponse.json({ error: "Erro ao criar empresa" }, { status: 500 })
      }
    }
  } catch (error) {
    console.error("[v0] API Companies: Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
