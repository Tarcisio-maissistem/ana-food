export interface EmpresaData {
  id?: string
  cnpj: string
  nome?: string
  name?: string // Campo da tabela companies
  telefone?: string
  phone?: string // Campo da tabela companies
  endereco?: string
  address?: string // Campo da tabela companies
  email?: string
  working_hours?: string
  delivery_time?: number
  minimum_order?: number
  location_link?: string
  notes?: string
  created_at?: string
  updated_at?: string
  ultima_atualizacao: string
}

const CACHE_KEY = "ana_food_empresa"
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas em millisegundos

export async function getEmpresa(): Promise<EmpresaData | null> {
  try {
    // Verifica cache primeiro
    const cache = localStorage.getItem(CACHE_KEY)
    if (cache) {
      const dados: EmpresaData = JSON.parse(cache)
      const expirado = new Date(dados.ultima_atualizacao) < new Date(Date.now() - CACHE_DURATION)

      if (!expirado) {
        console.log("Dados da empresa carregados do cache")
        return dados
      }
    }

    console.log("Buscando dados da empresa no servidor...")
    const res = await fetch("/api/companies", {
      headers: {
        "x-user-email": "tarcisiorp16@gmail.com", // Usando email do usuário logado
      },
    })

    if (!res.ok) {
      console.error(`Erro HTTP ao buscar empresa: ${res.status}`)
      throw new Error(`Erro HTTP: ${res.status}`)
    }

    const companyData = await res.json()
    console.log("Dados recebidos da API Companies:", companyData)

    const empresa: EmpresaData = {
      id: companyData.id,
      cnpj: companyData.cnpj || "",
      nome: companyData.name || "",
      name: companyData.name || "",
      telefone: companyData.phone || "",
      phone: companyData.phone || "",
      endereco: companyData.address || "",
      address: companyData.address || "",
      email: companyData.email || "",
      working_hours: companyData.working_hours || "",
      delivery_time: companyData.delivery_time || 0,
      minimum_order: companyData.minimum_order || 0,
      location_link: companyData.location_link || "",
      notes: companyData.notes || "",
      created_at: companyData.created_at || "",
      updated_at: companyData.updated_at || "",
      ultima_atualizacao: new Date().toISOString(),
    }

    // Atualiza cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(empresa))
    console.log("Dados da empresa atualizados no cache")

    return empresa
  } catch (error) {
    console.error("Erro ao buscar dados da empresa:", error)
    return null
  }
}

export async function updateEmpresa(dados: Partial<EmpresaData>): Promise<EmpresaData | null> {
  try {
    console.log("Enviando dados para atualização:", dados)

    const res = await fetch("/api/companies", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": "tarcisiorp16@gmail.com", // Usando email do usuário logado
      },
      body: JSON.stringify(dados),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`Erro HTTP ao atualizar empresa: ${res.status} - ${errorText}`)
      throw new Error(`Erro HTTP: ${res.status}`)
    }

    const companyData = await res.json()
    console.log("Dados atualizados recebidos:", companyData)

    const empresa: EmpresaData = {
      id: companyData.id,
      cnpj: companyData.cnpj || "",
      nome: companyData.name || "",
      name: companyData.name || "",
      telefone: companyData.phone || "",
      phone: companyData.phone || "",
      endereco: companyData.address || "",
      address: companyData.address || "",
      email: companyData.email || "",
      working_hours: companyData.working_hours || "",
      delivery_time: companyData.delivery_time || 0,
      minimum_order: companyData.minimum_order || 0,
      location_link: companyData.location_link || "",
      notes: companyData.notes || "",
      created_at: companyData.created_at || "",
      updated_at: companyData.updated_at || "",
      ultima_atualizacao: new Date().toISOString(),
    }

    // Atualiza cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(empresa))
    console.log("Dados da empresa atualizados no cache")

    return empresa
  } catch (error) {
    console.error("Erro ao atualizar dados da empresa:", error)
    throw error // Re-throw para que o componente possa tratar o erro
  }
}

export function getInstanceName(cnpj?: string): string {
  if (!cnpj) return "ana-food-instance"

  // Remove máscara do CNPJ
  const cnpjLimpo = cnpj.replace(/\D/g, "")
  return `ana-food-instance-${cnpjLimpo}`
}

export function clearEmpresaCache(): void {
  localStorage.removeItem(CACHE_KEY)
  console.log("Cache da empresa limpo")
}

export function formatCNPJ(cnpj: string): string {
  if (!cnpj) return ""
  const limpo = cnpj.replace(/\D/g, "")
  if (limpo.length !== 14) return cnpj
  return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

export function formatTelefone(telefone: string): string {
  if (!telefone) return ""
  const limpo = telefone.replace(/\D/g, "")
  if (limpo.length === 11) {
    return limpo.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3")
  } else if (limpo.length === 10) {
    return limpo.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3")
  }
  return telefone
}
