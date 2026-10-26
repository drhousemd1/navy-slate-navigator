import { useRef } from "react"
import type { DialogContentProps } from "@radix-ui/react-dialog"

type AutoFocusHandlers = Pick<DialogContentProps, "onOpenAutoFocus" | "onCloseAutoFocus">

// Controlled editors often open from a button outside DialogTrigger. Remember
// that opener as well, while allowing consumers to supply their own focus policy.
export function useDialogFocusHandlers({ onOpenAutoFocus, onCloseAutoFocus }: AutoFocusHandlers) {
  const openerRef = useRef<HTMLElement | null>(null)

  return {
    onOpenAutoFocus: (event: Event) => {
      openerRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
      onOpenAutoFocus?.(event)
      // Do not prevent the default: Radix focuses the first eligible control.
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event)
      if (event.defaultPrevented) return

      const opener = openerRef.current
      if (opener?.isConnected && opener !== document.body) {
        opener.focus({ preventScroll: true })
        if (document.activeElement === opener) event.preventDefault()
      }
    },
  }
}
