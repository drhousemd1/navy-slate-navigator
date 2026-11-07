
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Choose the correct editor shell on its first render, rather than replacing
  // an already-open desktop Dialog with a mobile Sheet and losing its opener.
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT)

  React.useEffect(() => {
    // Function to check if the screen is mobile width
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Set initial value
    if (typeof window !== 'undefined') {
      checkIfMobile()
    }
    
    // Add resize event listener with throttling
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const handleResize = () => {
      if (timeoutId === null) {
        timeoutId = setTimeout(() => {
          timeoutId = null
          checkIfMobile()
        }, 100)
      }
    }
    
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  return isMobile
}
