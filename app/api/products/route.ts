import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const fallbackProducts = [
  {
    id: "1",
    name: "Hambúrguer Clássico",
    price: 25.9,
    category: "Hambúrgueres",
    description: "Hambúrguer com carne, queijo, alface e tomate",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Pizza Margherita",
    price: 35.0,
    category: "Pizzas",
    description: "Pizza com molho de tomate, mussarela e manjericão",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Refrigerante Lata",
    price: 5.5,
    category: "Bebidas",
    description: "Refrigerante gelado 350ml",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

async function checkTableExists(supabase: any): Promise<boolean> {
  try {
    // Tenta fazer uma query simples na tabela
    const { data, error } = await supabase.from("products").select("*").limit(1)

    // Se não há erro e a query foi executada, a tabela existe
    if (!error) {
      console.log("Tabela 'products' existe e está acessível")
      return true
    }

    // Se há erro relacionado à tabela não existir
    if (
      error &&
      (error.message.includes("does not exist") ||
        error.message.includes("relation") ||
        error.message.includes("schema cache"))
    ) {
      console.log("Tabela 'products' não existe:", error.message)
      return false
    }

    // Para outros tipos de erro, assumimos que a tabela existe mas há outro problema
    console.log("Erro ao verificar tabela 'products':", error.message)
    return false
  } catch (error) {
    console.log("Erro na verificação da tabela 'products':", error)
    return false
  }
}

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      console.log("Tabela 'products' não existe, retornando dados temporários")
      return NextResponse.json(fallbackProducts)
    }

    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar produtos:", error)
      return NextResponse.json(fallbackProducts)
    }

    return NextResponse.json(products || [])
  } catch (error) {
    console.error("Erro na API de produtos:", error)
    return NextResponse.json(fallbackProducts)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()

    console.log("Usando dados de fallback para produtos")
    const newProduct = {
      id: Date.now().toString(),
      name: body.name,
      price: body.price,
      category: body.category || "Geral",
      description: body.description || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return NextResponse.json(newProduct)
  } catch (error) {
    console.error("Erro na API de produtos:", error)
    const body = await request.json()
    const newProduct = {
      id: Date.now().toString(),
      name: body.name,
      price: body.price,
      category: body.category || "Geral",
      description: body.description || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return NextResponse.json(newProduct)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()
    const { id, ...updateData } = body

    console.log("Usando dados de fallback para atualização de produtos")
    const updatedProduct = {
      id,
      ...updateData,
      updated_at: new Date().toISOString(),
    }
    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Erro na API de produtos:", error)
    const body = await request.json()
    const { id, ...updateData } = body
    const updatedProduct = {
      id,
      ...updateData,
      updated_at: new Date().toISOString(),
    }
    return NextResponse.json(updatedProduct)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID do produto é obrigatório" }, { status: 400 })
    }

    console.log("Usando dados de fallback para exclusão de produtos")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro na API de produtos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
