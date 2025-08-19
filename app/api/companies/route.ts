import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get("X-User-Email")
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (userEmail) {
      const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

      if (user) {
        const { data: company, error } = await supabase
          .from("companies")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (!error && company) {
          return NextResponse.json(company)
        }
      }
    }

    // Retorna dados vazios se não encontrar
    return NextResponse.json({
      name: "",
      cnpj: "",
      address: "",
      location_link: "",
      working_hours: "",
      delivery_time: "",
      minimum_order: "",
      notes: "",
      phone: "",
      email: "",
    })
  } catch (error) {
    console.error("Erro na API de companies:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userEmail = request.headers.get("X-User-Email")
    const body = await request.json()
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (userEmail) {
      const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

      if (user) {
        // Try to update existing company
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle()

        if (existingCompany) {
          // Update existing company
          const { data: company, error } = await supabase
            .from("companies")
            .update({
              name: body.name,
              cnpj: body.cnpj,
              phone: body.phone,
              address: body.address,
              email: body.email,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .select()
            .single()

          if (!error && company) {
            return NextResponse.json(company)
          }
        } else {
          // Create new company
          const { data: company, error } = await supabase
            .from("companies")
            .insert({
              name: body.name,
              cnpj: body.cnpj,
              phone: body.phone,
              address: body.address,
              email: body.email,
              user_id: user.id,
            })
            .select()
            .single()

          if (!error && company) {
            return NextResponse.json(company)
          }
        }
      }
    }

    return NextResponse.json({ error: "Erro ao salvar empresa" }, { status: 500 })
  } catch (error) {
    console.error("Erro na API de companies PUT:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
