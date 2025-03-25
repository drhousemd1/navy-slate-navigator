
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

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
    let timeoutId: NodeJS.Timeout | null = null
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
