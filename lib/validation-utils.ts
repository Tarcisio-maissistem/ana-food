export const MaskUtils = {
  // Aplicar máscaras dinamicamente
  applyMask(value: string, pattern: string): string {
    const numbers = value.replace(/\D/g, "")
    let formatted = ""
    let numberIndex = 0

    for (let i = 0; i < pattern.length && numberIndex < numbers.length; i++) {
      if (pattern[i] === "#") {
        formatted += numbers[numberIndex++]
      } else {
        formatted += pattern[i]
      }
    }
    return formatted
  },

  // Máscaras específicas
  cpf: (value: string) => MaskUtils.applyMask(value, "###.###.###-##"),
  cnpj: (value: string) => MaskUtils.applyMask(value, "##.###.###/####-##"),
  phone: (value: string) => {
    const numbers = value.replace(/\D/g, "")
    return numbers.length <= 10
      ? MaskUtils.applyMask(value, "(##) ####-####")
      : MaskUtils.applyMask(value, "(##) #####-####")
  },
  cep: (value: string) => MaskUtils.applyMask(value, "#####-###"),

  // Máscara dinâmica CPF/CNPJ
  document(value: string, type: "fisica" | "juridica"): string {
    return type === "fisica" ? this.cpf(value) : this.cnpj(value)
  },
}

export const ValidationUtils = {
  email: (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  cpf: (cpf: string): boolean => {
    const numbers = cpf.replace(/\D/g, "")
    if (numbers.length !== 11 || /^(\d)\1+$/.test(numbers)) return false

    // Algoritmo de validação CPF
    let sum = 0
    for (let i = 0; i < 9; i++) sum += Number.parseInt(numbers[i]) * (10 - i)
    let digit1 = 11 - (sum % 11)
    if (digit1 > 9) digit1 = 0

    sum = 0
    for (let i = 0; i < 10; i++) sum += Number.parseInt(numbers[i]) * (11 - i)
    let digit2 = 11 - (sum % 11)
    if (digit2 > 9) digit2 = 0

    return Number.parseInt(numbers[9]) === digit1 && Number.parseInt(numbers[10]) === digit2
  },

  cnpj: (cnpj: string): boolean => {
    const numbers = cnpj.replace(/\D/g, "")
    if (numbers.length !== 14) return false

    // Algoritmo de validação CNPJ
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    let sum = 0
    for (let i = 0; i < 12; i++) sum += Number.parseInt(numbers[i]) * weights1[i]
    const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11)

    sum = 0
    for (let i = 0; i < 13; i++) sum += Number.parseInt(numbers[i]) * weights2[i]
    const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11)

    return Number.parseInt(numbers[12]) === digit1 && Number.parseInt(numbers[13]) === digit2
  },

  phone: (phone: string): boolean => {
    const numbers = phone.replace(/\D/g, "")
    return numbers.length >= 10 && numbers.length <= 11
  },

  cep: (cep: string): boolean => {
    const numbers = cep.replace(/\D/g, "")
    return numbers.length === 8
  },
}

// Serviços de consulta externa
export class CNPJService {
  static async consultCNPJ(cnpj: string) {
    try {
      const cleanCNPJ = cnpj.replace(/\D/g, "")
      const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`)

      if (!response.ok) throw new Error("CNPJ não encontrado")

      const data = await response.json()

      if (data.status === "ERROR") {
        throw new Error(data.message || "CNPJ inválido")
      }

      return {
        razao_social: data.nome,
        nome_fantasia: data.fantasia,
        cnae_principal: data.atividade_principal?.[0]?.text,
        situacao: data.situacao,
        endereco: {
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cep: data.cep,
          municipio: data.municipio,
          uf: data.uf,
        },
        telefone: data.telefone,
        email: data.email,
      }
    } catch (error) {
      throw new Error(`Erro na consulta CNPJ: ${error.message}`)
    }
  }
}

export class CEPService {
  static async consultCEP(cep: string) {
    try {
      const cleanCEP = cep.replace(/\D/g, "")

      if (cleanCEP.length !== 8) {
        throw new Error("CEP deve ter 8 dígitos")
      }

      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)

      if (!response.ok) throw new Error("Erro na consulta do CEP")

      const data = await response.json()

      if (data.erro) {
        throw new Error("CEP não encontrado")
      }

      return {
        cep: data.cep,
        logradouro: data.logradouro,
        complemento: data.complemento,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
        ibge: data.ibge,
        gia: data.gia,
        ddd: data.ddd,
        siafi: data.siafi,
      }
    } catch (error) {
      throw new Error(`Erro na consulta CEP: ${error.message}`)
    }
  }
}

// Named exports for validation functions
export const validateCPF = ValidationUtils.cpf
export const validateCNPJ = ValidationUtils.cnpj
export const validateEmail = ValidationUtils.email
export const validatePhone = ValidationUtils.phone
export const validateCEP = ValidationUtils.cep

// Named exports for formatting functions
export const formatCEP = MaskUtils.cep
export const formatCPF = MaskUtils.cpf
export const formatCNPJ = MaskUtils.cnpj
export const formatPhone = MaskUtils.phone
export const formatDocument = MaskUtils.document
