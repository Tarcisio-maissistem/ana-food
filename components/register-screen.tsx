"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChefHat,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Building,
  Phone,
  FileText,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import { validateCPF, validateCNPJ, formatCPF, formatCNPJ, formatPhone } from "@/lib/validation-utils"

interface RegisterScreenProps {
  onBackToLogin: () => void
  onRegisterSuccess: () => void
}

export function RegisterScreen({ onBackToLogin, onRegisterSuccess }: RegisterScreenProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSuccess, setIsSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [formData, setFormData] = useState({
    cpf: "",
    nomeCompleto: "",
    email: "",
    phone: "",
    cnpj: "",
    nomeFantasia: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })

  const [validations, setValidations] = useState({
    cpf: false,
    cnpj: false,
    email: false,
    phone: false,
    password: false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [loadingCNPJ, setLoadingCNPJ] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    const newValidations = {
      cpf: validateCPF(formData.cpf),
      cnpj: formData.cnpj ? validateCNPJ(formData.cnpj) : true, // CNPJ é opcional
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      phone: formData.phone.replace(/\D/g, "").length >= 10,
      password: formData.password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password),
    }
    setValidations(newValidations)
  }, [formData])

  const focusNextField = (currentField: string) => {
    const fieldOrder = [
      "cpf",
      "nomeCompleto",
      "email",
      "phone",
      "cnpj",
      "nomeFantasia",
      "cep",
      "endereco",
      "numero",
      "bairro",
      "cidade",
      "estado",
    ]
    const currentIndex = fieldOrder.indexOf(currentField)
    if (currentIndex !== -1 && currentIndex < fieldOrder.length - 1) {
      const nextField = fieldOrder[currentIndex + 1]
      const nextInput = document.querySelector(`input[name="${nextField}"]`) as HTMLInputElement
      if (nextInput) {
        setTimeout(() => nextInput.focus(), 100)
      }
    }
  }

  const handleCNPJChange = async (cnpj: string) => {
    const formattedCNPJ = formatCNPJ(cnpj)
    handleInputChange("cnpj", formattedCNPJ)

    const cleanCNPJ = cnpj.replace(/\D/g, "")
    if (cleanCNPJ.length === 14) {
      focusNextField("cnpj")
      setLoadingCNPJ(true)
      try {
        const response = await fetch(`/api/cnpj/${cleanCNPJ}`)
        const data = await response.json()

        if (response.ok && data.status === "OK") {
          setFormData((prev) => ({
            ...prev,
            nomeFantasia: data.fantasia || data.nome || "",
            endereco: data.logradouro || "",
            numero: data.numero || "",
            complemento: data.complemento || "",
            bairro: data.bairro || "",
            cidade: data.municipio || "",
            estado: data.uf || "",
            cep: data.cep || "",
          }))
        } else {
          console.error("CNPJ não encontrado ou inválido")
        }
      } catch (error) {
        console.error("Erro ao buscar CNPJ:", error)
        setError("Erro ao consultar CNPJ. Verifique a conexão e tente novamente.")
      } finally {
        setLoadingCNPJ(false)
      }
    }
  }

  const getDetailedValidationErrors = () => {
    const errors: string[] = []

    if (currentStep === 1) {
      if (!validations.cpf) errors.push("CPF inválido")
      if (!formData.nomeCompleto.trim()) errors.push("Nome completo é obrigatório")
      if (!validations.email) errors.push("E-mail inválido")
      if (!validations.phone) errors.push("Telefone inválido")
    } else if (currentStep === 2) {
      if (!formData.nomeFantasia.trim()) errors.push("Nome fantasia é obrigatório")
      if (!formData.cep.trim()) errors.push("CEP é obrigatório")
      if (!formData.endereco.trim()) errors.push("Endereço é obrigatório")
      if (!formData.numero.trim()) errors.push("Número é obrigatório")
      if (!formData.bairro.trim()) errors.push("Bairro é obrigatório")
      if (!formData.cidade.trim()) errors.push("Cidade é obrigatória")
      if (!formData.estado.trim()) errors.push("Estado é obrigatório")
    } else if (currentStep === 3) {
      if (!validations.password) errors.push("Senha deve ter pelo menos 8 caracteres com maiúscula, minúscula e número")
      if (formData.password !== formData.confirmPassword) errors.push("Senhas não coincidem")
      if (!formData.acceptTerms) errors.push("Aceite dos termos é obrigatório")
    }

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors = getDetailedValidationErrors()
    if (errors.length > 0) {
      setValidationErrors(errors)
      setError(`Campos obrigatórios faltando: ${errors.join(", ")}`)
      return
    }

    setIsLoading(true)
    setError("")
    setValidationErrors([])

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem")
      setIsLoading(false)
      return
    }

    try {
      console.log("[v0] Enviando dados de cadastro:", { ...formData, password: "***", confirmPassword: "***" })
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro no cadastro")
      }

      const result = await response.json()

      setIsSuccess(true)
      setSuccessMessage(
        `Conta criada com sucesso! Um email de confirmação foi enviado para ${formData.email}. Verifique sua caixa de entrada e spam.`,
      )

      setTimeout(() => {
        onRegisterSuccess()
      }, 3000)
    } catch (error: any) {
      console.log("[v0] Erro no cadastro:", error.message)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value

    if (field === "cpf") {
      formattedValue = formatCPF(value)
      if (formattedValue.replace(/\D/g, "").length === 11) {
        focusNextField("cpf")
      }
    } else if (field === "cnpj") {
      formattedValue = formatCNPJ(value)
    } else if (field === "phone") {
      formattedValue = formatPhone(value)
      if (formattedValue.replace(/\D/g, "").length >= 10) {
        focusNextField("phone")
      }
    }

    setFormData((prev) => ({ ...prev, [field]: formattedValue }))
  }

  const nextStep = () => {
    const errors = getDetailedValidationErrors()
    if (errors.length > 0) {
      setValidationErrors(errors)
      setError(`Para continuar, corrija: ${errors.join(", ")}`)
      return
    }

    setValidationErrors([])
    setError("")
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const getStepValidation = (step: number) => {
    switch (step) {
      case 1:
        return validations.cpf && formData.nomeCompleto && validations.email && validations.phone
      case 2:
        return (
          formData.nomeFantasia &&
          formData.cep &&
          formData.endereco &&
          formData.numero &&
          formData.bairro &&
          formData.cidade &&
          formData.estado
        )
      case 3:
        return validations.password && formData.password === formData.confirmPassword && formData.acceptTerms
      default:
        return false
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Dados Pessoais</h3>

            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                name="cpf"
                type="text"
                placeholder="CPF do responsável"
                value={formData.cpf}
                onChange={(e) => handleInputChange("cpf", e.target.value)}
                className="pl-10 pr-10 h-12"
                required
              />
              {formData.cpf && (
                <div className="absolute right-3 top-3">
                  {validations.cpf ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                name="nomeCompleto"
                type="text"
                placeholder="Nome completo do responsável"
                value={formData.nomeCompleto}
                onChange={(e) => handleInputChange("nomeCompleto", e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                name="email"
                type="email"
                placeholder="E-mail para login"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="pl-10 pr-10 h-12"
                required
              />
              {formData.email && (
                <div className="absolute right-3 top-3">
                  {validations.email ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                name="phone"
                type="tel"
                placeholder="Telefone/WhatsApp"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="pl-10 pr-10 h-12"
                required
              />
              {formData.phone && (
                <div className="absolute right-3 top-3">
                  {validations.phone ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Dados da Empresa</h3>
            <p className="text-sm text-gray-600 text-center">
              Informe o CNPJ para preenchimento automático ou preencha manualmente
            </p>

            <div className="relative">
              <Building className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                name="cnpj"
                type="text"
                placeholder="CNPJ (opcional)"
                value={formData.cnpj}
                onChange={(e) => handleCNPJChange(e.target.value)}
                className="pl-10 pr-10 h-12"
              />
              {loadingCNPJ && (
                <div className="absolute right-3 top-3">
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {formData.cnpj && !loadingCNPJ && (
                <div className="absolute right-3 top-3">
                  {validations.cnpj ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>

            <Input
              name="nomeFantasia"
              type="text"
              placeholder="Nome fantasia *"
              value={formData.nomeFantasia}
              onChange={(e) => handleInputChange("nomeFantasia", e.target.value)}
              className="h-12"
              required
            />

            <Input
              name="cep"
              type="text"
              placeholder="CEP *"
              value={formData.cep}
              onChange={(e) => handleInputChange("cep", e.target.value)}
              className="h-12"
              required
            />

            <Input
              name="endereco"
              type="text"
              placeholder="Endereço *"
              value={formData.endereco}
              onChange={(e) => handleInputChange("endereco", e.target.value)}
              className="h-12"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="numero"
                type="text"
                placeholder="Número *"
                value={formData.numero}
                onChange={(e) => handleInputChange("numero", e.target.value)}
                className="h-12"
                required
              />
              <Input
                name="complemento"
                type="text"
                placeholder="Complemento"
                value={formData.complemento}
                onChange={(e) => handleInputChange("complemento", e.target.value)}
                className="h-12"
              />
            </div>

            <Input
              name="bairro"
              type="text"
              placeholder="Bairro *"
              value={formData.bairro}
              onChange={(e) => handleInputChange("bairro", e.target.value)}
              className="h-12"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="cidade"
                type="text"
                placeholder="Cidade *"
                value={formData.cidade}
                onChange={(e) => handleInputChange("cidade", e.target.value)}
                className="h-12"
                required
              />
              <Input
                name="estado"
                type="text"
                placeholder="Estado *"
                value={formData.estado}
                onChange={(e) => handleInputChange("estado", e.target.value)}
                className="h-12"
                maxLength={2}
                required
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Finalizar Cadastro</h3>

            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha (mín. 8 caracteres)"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="pl-10 pr-10 h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-xs text-gray-600 space-y-1">
              <p className={validations.password ? "text-green-600" : ""}>
                ✓ Mínimo 8 caracteres, com maiúscula, minúscula e número
              </p>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirme sua senha"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className="pl-10 pr-10 h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-xs text-red-600">As senhas não coincidem</p>
            )}

            <div className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
              <Checkbox
                id="terms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, acceptTerms: !!checked }))}
              />
              <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                Aceito os{" "}
                <button type="button" className="text-orange-600 hover:underline">
                  Termos de Uso
                </button>{" "}
                e{" "}
                <button type="button" className="text-orange-600 hover:underline">
                  Política de Privacidade
                </button>{" "}
                do Ana Food
              </label>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Conta Criada!</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Você será redirecionado automaticamente para o login em alguns segundos...
              </p>

              <Button onClick={onBackToLogin} className="w-full h-12 bg-orange-500 hover:bg-orange-600">
                Ir para Login Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">Ana Food</CardTitle>
          <p className="text-gray-600">Criar Nova Conta</p>

          <div className="space-y-2">
            <Progress value={(currentStep / 3) * 100} className="h-2" />
            <p className="text-xs text-gray-500">Etapa {currentStep} de 3</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {validationErrors.length > 0 && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800">
                  <div className="space-y-1">
                    <p className="font-medium">Campos que precisam ser corrigidos:</p>
                    <ul className="list-disc list-inside text-sm">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {renderStep()}

            <div className="flex gap-4">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-12 bg-transparent">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              )}

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!getStepValidation(currentStep)}
                  className="flex-1 h-12 bg-orange-500 hover:bg-orange-600"
                >
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading || !getStepValidation(3)}
                  className="flex-1 h-12 bg-orange-500 hover:bg-orange-600"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Criando conta...
                    </div>
                  ) : (
                    "Criar Conta"
                  )}
                </Button>
              )}
            </div>
          </form>

          <div className="text-center text-sm text-gray-600">
            Já tem conta?{" "}
            <Button variant="link" className="p-0 h-auto text-orange-600 hover:text-orange-700" onClick={onBackToLogin}>
              Fazer login →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
