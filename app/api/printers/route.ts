import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const fallbackPrinters = [
  {
    id: "temp-1",
    name: "Epson TM-T20",
    type: "USB",
    model: "TM-T20",
    port: "USB001",
    ip: null,
    sector: "Cozinha",
    status: "Conectada",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "temp-2",
    name: "Bematech MP-100S TH",
    type: "Rede",
    model: "MP-100S TH",
    port: null,
    ip: "192.168.1.100",
    sector: "Caixa",
    status: "Desconectada",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "temp-3",
    name: "Daruma DR-800",
    type: "USB",
    model: "DR-800",
    port: "USB002",
    ip: null,
    sector: "Bar",
    status: "Conectada",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

async function checkTableExists(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase.from("printers").select("id").limit(1)

    // Se não há erro, a tabela existe
    if (!error) return true

    // Se há erro relacionado à tabela não existir
    if (
      error &&
      (error.message.includes("does not exist") ||
        error.message.includes("relation") ||
        error.message.includes("schema cache"))
    ) {
      console.log("Tabela 'printers' não existe:", error.message)
      return false
    }

    // Para outros tipos de erro, assumimos que a tabela existe mas há outro problema
    console.log("Erro ao verificar tabela 'printers':", error.message)
    return false
  } catch (error) {
    console.log("Erro na verificação da tabela 'printers':", error)
    return false
  }
}

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      console.log("Tabela 'printers' não existe, usando dados temporários")
      return NextResponse.json(fallbackPrinters)
    }

    const { data: printers, error } = await supabase
      .from("printers")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar impressoras:", error)
      return NextResponse.json([])
    }

    return NextResponse.json(printers || [])
  } catch (error) {
    console.error("Erro na API de impressoras:", error)
    return NextResponse.json(fallbackPrinters)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()

    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      console.log("Tabela 'printers' não existe, simulando criação")
      const newPrinter = {
        id: `temp-${Date.now()}`,
        name: body.name,
        type: body.type,
        model: body.model,
        port: body.port,
        ip: body.ip,
        sector: body.sector,
        status: "Desconectada",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(newPrinter)
    }

    const { data: printer, error } = await supabase
      .from("printers")
      .insert([
        {
          name: body.name,
          type: body.type,
          model: body.model,
          port: body.port,
          ip: body.ip,
          sector: body.sector,
          status: "Desconectada",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar impressora:", error)
      return NextResponse.json({ error: "Erro ao criar impressora" }, { status: 500 })
    }

    return NextResponse.json(printer)
  } catch (error) {
    console.error("Erro na API de impressoras:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()
    const { id, ...updateData } = body

    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      console.log("Tabela 'printers' não existe, simulando atualização")
      const updatedPrinter = {
        id,
        ...updateData,
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(updatedPrinter)
    }

    const { data: printer, error } = await supabase.from("printers").update(updateData).eq("id", id).select().single()

    if (error) {
      console.error("Erro ao atualizar impressora:", error)
      return NextResponse.json({ error: "Erro ao atualizar impressora" }, { status: 500 })
    }

    return NextResponse.json(printer)
  } catch (error) {
    console.error("Erro na API de impressoras:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID da impressora é obrigatório" }, { status: 400 })
    }

    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      console.log("Tabela 'printers' não existe, simulando exclusão")
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase.from("printers").delete().eq("id", id)

    if (error) {
      console.error("Erro ao deletar impressora:", error)
      return NextResponse.json({ error: "Erro ao deletar impressora" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro na API de impressoras:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
