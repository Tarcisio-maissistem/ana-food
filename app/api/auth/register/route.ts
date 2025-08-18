import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const {
      cpf,
      cnpj,
      nomeFantasia,
      nomeCompleto,
      email,
      phone,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      password,
      acceptTerms,
    } = await request.json()

    console.log("[v0] Dados recebidos na API:", { cpf, cnpj, nomeFantasia, nomeCompleto, email, phone, acceptTerms })

    if (!cpf || !nomeCompleto || !email || !phone || !password || !acceptTerms) {
      const missingFields = []
      if (!cpf) missingFields.push("CPF")
      if (!nomeCompleto) missingFields.push("Nome completo")
      if (!email) missingFields.push("E-mail")
      if (!phone) missingFields.push("Telefone")
      if (!password) missingFields.push("Senha")
      if (!acceptTerms) missingFields.push("Aceite dos termos")

      console.log("[v0] Campos obrigatórios faltando:", missingFields)
      return NextResponse.json(
        {
          error: `Campos obrigatórios faltando: ${missingFields.join(", ")}`,
        },
        { status: 400 },
      )
    }

    const { data: existingEmail } = await supabase.from("users").select("id").eq("email", email).single()

    if (existingEmail) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado" }, { status: 409 })
    }

    const { data: existingDoc } = await supabase.from("users").select("id").eq("documento", cpf).single()

    if (existingDoc) {
      return NextResponse.json({ error: "Este CPF já está cadastrado" }, { status: 409 })
    }

    const { data: existingPhone } = await supabase.from("users").select("id").eq("phone", phone).single()

    if (existingPhone) {
      return NextResponse.json({ error: "Este telefone já está cadastrado" }, { status: 409 })
    }

    if (nomeFantasia) {
      const { data: existingName } = await supabase
        .from("users")
        .select("id")
        .eq("nome_fantasia", nomeFantasia)
        .single()

      if (existingName) {
        return NextResponse.json({ error: "Este nome fantasia já está cadastrado" }, { status: 409 })
      }
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 12)

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        name: nomeCompleto,
        email,
        password_hash: passwordHash,
        company_name: nomeFantasia || nomeCompleto,
        phone,
        role: "admin",
        active: true, // Usando 'active' em vez de 'is_active' conforme schema
        tipo_pessoa: cnpj ? "juridica" : "fisica",
        documento: cpf, // CPF vai para o campo 'documento'
        nome_fantasia: nomeFantasia || nomeCompleto,
        nome_responsavel: nomeCompleto,
        cep,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar usuário:", error)
      return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 })
    }

    console.log("[v0] Usuário criado com sucesso:", user.id)

    const empresaData = {
      nome: nomeFantasia || nomeCompleto,
      cnpj: cnpj || `CPF-${cpf}`, // Se não tiver CNPJ, usa CPF como identificador
      telefone: phone,
      endereco: endereco && numero ? `${endereco}, ${numero}${complemento ? `, ${complemento}` : ""}` : null,
      email: email,
      ativo: true,
      user_id: user.id, // Associar empresa ao usuário
    }

    // Verificar se já existe empresa com este CNPJ/CPF
    const { data: existingEmpresa } = await supabase.from("empresas").select("id").eq("cnpj", empresaData.cnpj).single()

    if (!existingEmpresa) {
      const { data: empresa, error: empresaError } = await supabase
        .from("empresas")
        .insert(empresaData)
        .select()
        .single()

      if (empresaError) {
        console.error("Erro ao criar empresa:", empresaError)
        // Não falha o registro se não conseguir criar a empresa
        console.log("[v0] Continuando sem criar empresa devido ao erro:", empresaError.message)
      } else {
        console.log("[v0] Empresa criada com sucesso:", empresa.id)
      }
    } else {
      console.log("[v0] Empresa já existe, pulando criação")
    }

    const defaultSettings = [
      { user_id: user.id, key: "auto_accept", value: { enabled: false } },
      { user_id: user.id, key: "sound_enabled", value: { enabled: true } },
      {
        user_id: user.id,
        key: "visible_columns",
        value: { novo: true, preparando: true, pronto: true, em_entrega: true, concluido: true, cancelado: false },
      },
      { user_id: user.id, key: "delivery_time", value: { minutes: 45 } },
      { user_id: user.id, key: "pickup_time", value: { minutes: 30 } },
      { user_id: user.id, key: "store_status", value: { open: true } },
      {
        user_id: user.id,
        key: "working_hours",
        value: {
          monday: { open: "08:00", close: "22:00", enabled: true },
          tuesday: { open: "08:00", close: "22:00", enabled: true },
          wednesday: { open: "08:00", close: "22:00", enabled: true },
          thursday: { open: "08:00", close: "22:00", enabled: true },
          friday: { open: "08:00", close: "22:00", enabled: true },
          saturday: { open: "08:00", close: "22:00", enabled: true },
          sunday: { open: "08:00", close: "22:00", enabled: false },
        },
      },
    ]

    await supabase.from("user_settings").insert(defaultSettings)

    return NextResponse.json({
      message: "Conta criada com sucesso",
      user: {
        id: user.id,
        name: user.nome_responsavel,
        email: user.email,
        companyName: user.nome_fantasia,
      },
    })
  } catch (error) {
    console.error("Erro no registro:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
