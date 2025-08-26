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

      const { data: companyByCnpj } = await supabase
        .from("companies")
        .select("*")
        .or("cnpj.eq.12345678000199,cnpj.eq.12.345.678/0001-99")
        .maybeSingle()

      if (companyByCnpj) {
        console.log("[v0] API Companies: Empresa encontrada pelo CNPJ:", {
          name: companyByCnpj.name,
          cnpj: companyByCnpj.cnpj,
          user_id: companyByCnpj.user_id,
        })
        return NextResponse.json(companyByCnpj)
      }

      const { data: company, error } = await supabase.from("companies").select("*").eq("user_id", user.id).maybeSingle()

      if (!error && company) {
        console.log("[v0] API Companies: Empresa encontrada por user_id:", {
          name: company.name,
          cnpj: company.cnpj,
          user_id: company.user_id,
        })
        return NextResponse.json(company)
      } else {
        console.log("[v0] API Companies: Nenhuma empresa encontrada para user_id:", user.id)
        if (error) {
          console.error("[v0] API Companies: Erro na consulta:", error)
        }
      }
    } else {
      console.log("[v0] API Companies: Usuário não encontrado para email:", userEmail)
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
      minimum_order: "0.00",
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

    const { data: tableInfo } = await supabase.from("companies").select("*").limit(1).maybeSingle()

    let availableColumns: string[] = []
    if (tableInfo) {
      availableColumns = Object.keys(tableInfo)
      console.log("[v0] API Companies: Colunas disponíveis:", availableColumns)
    }

    const addressComponents = [
      body.rua || "",
      body.numero || "",
      body.complemento || "",
      body.bairro || "",
      body.cidade || "",
      body.uf || "",
      body.cep || "",
    ].filter((component) => component.trim() !== "")

    const fullAddress = addressComponents.length > 0 ? addressComponents.join(", ") : "Endereço não informado"
    console.log("[v0] API Companies: Endereço criado:", fullAddress)

    let workingHours = "08:00 - 18:00" // Default fallback

    if (body.horarios && typeof body.horarios === "object") {
      // Find the first open day to use as general working hours
      const days = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]
      const openDay = days.find(
        (day) =>
          body.horarios[day] &&
          !body.horarios[day].fechado &&
          body.horarios[day].abertura &&
          body.horarios[day].fechamento,
      )

      if (openDay) {
        const daySchedule = body.horarios[openDay]
        workingHours = `${daySchedule.abertura} - ${daySchedule.fechamento}`
      }
    }

    console.log("[v0] API Companies: Working hours criado:", workingHours)

    const deliveryTime = body.tempo_medio_preparo || "30" // Default to 30 minutes
    console.log("[v0] API Companies: Delivery time criado:", deliveryTime)

    const minimumOrder = body.minimum_order || body.pedido_minimo || "0.00" // Default to 0.00
    console.log("[v0] API Companies: Minimum order criado:", minimumOrder)

    const allFields = {
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
      address: fullAddress,
      working_hours: workingHours,
      delivery_time: deliveryTime,
      minimum_order: minimumOrder,
      horarios: body.horarios || {},
      tempo_medio_preparo: body.tempo_medio_preparo || "30",
      retirada_local: body.retirada_local !== false,
      entrega_propria: body.entrega_propria !== false,
      entrega_motoboy: body.entrega_motoboy || false,
      link_cardapio: body.link_cardapio || "",
      logo_url: body.logo_url || null,
      photos: body.photos || [],
      ...(availableColumns.includes("user_id") ? { user_id: user.id } : {}),
      updated_at: new Date().toISOString(),
    }

    const companyData: any = {}
    Object.keys(allFields).forEach((key) => {
      if (availableColumns.includes(key)) {
        companyData[key] = allFields[key as keyof typeof allFields]
      } else {
        console.log(`[v0] API Companies: Ignorando campo '${key}' que não existe na tabela`)
      }
    })

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
