import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    console.log("[v0] Delivery Zones API: Buscando bairros para usuário:", userEmail)

    // Buscar usuário
    const { data: user, error: userError } = await supabase.from("users").select("id").eq("email", userEmail).single()
    console.log("[v0] Delivery Zones API: Usuário encontrado:", user?.id, "Erro:", userError)

    if (!user) {
      console.log("[v0] Delivery Zones API: Usuário não encontrado")
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Primeiro tentar buscar por CNPJ (abordagem que funciona em outras APIs)
    const { data: companiesByCnpj, error: cnpjError } = await supabase
      .from("companies")
      .select("id, cnpj")
      .not("cnpj", "is", null)
      .limit(10)

    console.log(
      "[v0] Delivery Zones API: Empresas encontradas por CNPJ:",
      companiesByCnpj?.length || 0,
      "Erro:",
      cnpjError,
    )

    let company = null

    // Se encontrou empresas, usar a primeira (assumindo que há apenas uma empresa ativa)
    if (companiesByCnpj && companiesByCnpj.length > 0) {
      company = companiesByCnpj[0]
      console.log("[v0] Delivery Zones API: Usando empresa encontrada por CNPJ:", company.id)
    } else {
      // Fallback: tentar buscar por user_id
      const { data: companyByUser, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      console.log("[v0] Delivery Zones API: Empresa encontrada por user_id:", companyByUser?.id, "Erro:", companyError)
      company = companyByUser
    }

    if (!company) {
      console.log("[v0] Delivery Zones API: Empresa não encontrada")
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    console.log("[v0] Delivery Zones API: Buscando bairros para company_id:", company.id)
    const { data: zones, error } = await supabase
      .from("delivery_zones")
      .select("id, zone, price, active, created_at, updated_at")
      .eq("company_id", company.id)
      .order("zone")

    console.log("[v0] Delivery Zones API: Bairros encontrados:", zones?.length || 0, "Erro:", error)

    if (error) {
      console.error("[v0] Delivery Zones API: Erro ao buscar bairros:", error)

      if (
        error.message.includes("does not exist") ||
        error.message.includes("relation") ||
        error.message.includes("column")
      ) {
        console.log("[v0] Delivery Zones API: Tabela delivery_zones não existe - retornando instruções")
        return NextResponse.json({
          zones: [],
          tableExists: false,
          message: "A tabela delivery_zones precisa ser criada no banco de dados",
          sqlScript: `-- Execute este script no seu banco Supabase:

CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  zone VARCHAR NOT NULL,
  price NUMERIC NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Criar política de segurança
CREATE POLICY "delivery_zones_policy" ON delivery_zones
FOR ALL USING (
  company_id IN (
    SELECT id FROM companies 
    WHERE user_id = auth.uid() 
    OR cnpj IS NOT NULL
  )
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_delivery_zones_company_id ON delivery_zones(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(active);`,
        })
      }

      return NextResponse.json({ error: "Erro ao buscar bairros", zones: [] }, { status: 500 })
    }

    console.log("[v0] Delivery Zones API: Retornando", zones?.length || 0, "bairros")
    return NextResponse.json(zones || [])
  } catch (error) {
    console.error("[v0] Delivery Zones API: Erro na API delivery-zones:", error)
    return NextResponse.json({ error: "Erro interno do servidor", zones: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const body = await request.json()

    // Buscar usuário
    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Primeiro tentar buscar por CNPJ
    const { data: companiesByCnpj } = await supabase
      .from("companies")
      .select("id, cnpj")
      .not("cnpj", "is", null)
      .limit(10)

    let company = null

    if (companiesByCnpj && companiesByCnpj.length > 0) {
      company = companiesByCnpj[0]
    } else {
      // Fallback: tentar buscar por user_id
      const { data: companyByUser } = await supabase.from("companies").select("id").eq("user_id", user.id).maybeSingle()
      company = companyByUser
    }

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    // Criar bairro de entrega
    const { data: zone, error } = await supabase
      .from("delivery_zones")
      .insert({
        company_id: company.id,
        zone: body.zone,
        price: body.price,
        active: body.active,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Delivery Zones API: Erro ao criar bairro:", error)
      return NextResponse.json({ error: "Erro ao criar bairro" }, { status: 500 })
    }

    return NextResponse.json(zone)
  } catch (error) {
    console.error("[v0] Delivery Zones API: Erro na API delivery-zones POST:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
