"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"

interface SweetAlertOptions {
  title: string
  text?: string
  icon?: "success" | "error" | "warning" | "info"
  showCancelButton?: boolean
  confirmButtonText?: string
  cancelButtonText?: string
  confirmButtonColor?: string
  cancelButtonColor?: string
}

interface SweetAlertState {
  isOpen: boolean
  options: SweetAlertOptions
  resolve?: (result: { isConfirmed: boolean; isDenied?: boolean; isDismissed?: boolean }) => void
}

export function useSweetAlert() {
  const [alertState, setAlertState] = useState<SweetAlertState>({
    isOpen: false,
    options: { title: "" },
  })

  const getIcon = (icon?: string) => {
    switch (icon) {
      case "success":
        return <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      case "error":
        return <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
      case "warning":
        return <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
      case "info":
        return <Info className="h-16 w-16 text-blue-500 mx-auto mb-4" />
      default:
        return null
    }
  }

  const fire = (
    options: SweetAlertOptions,
  ): Promise<{ isConfirmed: boolean; isDenied?: boolean; isDismissed?: boolean }> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        options,
        resolve,
      })
    })
  }

  const handleConfirm = () => {
    alertState.resolve?.({ isConfirmed: true })
    setAlertState((prev) => ({ ...prev, isOpen: false }))
  }

  const handleCancel = () => {
    alertState.resolve?.({ isConfirmed: false, isDismissed: true })
    setAlertState((prev) => ({ ...prev, isOpen: false }))
  }

  const SweetAlertComponent = () => {
    if (!alertState.isOpen) return null

    const { options } = alertState

    if (options.showCancelButton) {
      return (
        <AlertDialog open={alertState.isOpen} onOpenChange={(open) => !open && handleCancel()}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader className="text-center">
              {getIcon(options.icon)}
              <AlertDialogTitle className="text-xl font-semibold">{options.title}</AlertDialogTitle>
              {options.text && (
                <AlertDialogDescription className="text-center text-gray-600">{options.text}</AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2 justify-center">
              <AlertDialogCancel onClick={handleCancel} className="px-6">
                {options.cancelButtonText || "Cancelar"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                className={`px-6 ${options.confirmButtonColor === "red" ? "bg-red-500 hover:bg-red-600" : ""}`}
              >
                {options.confirmButtonText || "Confirmar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
    }

    return (
      <Dialog open={alertState.isOpen} onOpenChange={(open) => !open && handleConfirm()}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            {getIcon(options.icon)}
            <DialogTitle className="text-xl font-semibold">{options.title}</DialogTitle>
            {options.text && (
              <DialogDescription className="text-center text-gray-600">{options.text}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="justify-center">
            <Button onClick={handleConfirm} className="px-8">
              {options.confirmButtonText || "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return {
    fire,
    SweetAlertComponent,
  }
}

// Função global para compatibilidade com SweetAlert2
export const Swal = {
  fire: (options: SweetAlertOptions) => {
    // Esta é uma implementação simplificada para uso global
    // Em componentes React, use o hook useSweetAlert
    return Promise.resolve({ isConfirmed: true })
  },
}
