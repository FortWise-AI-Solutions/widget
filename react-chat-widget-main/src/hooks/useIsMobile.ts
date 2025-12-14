import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const checkIsMobile = () => {
      // Use Visual Viewport API if available, otherwise fall back to window.innerWidth
      const width = window.visualViewport?.width || window.innerWidth;
      return width < MOBILE_BREAKPOINT;
    };

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(checkIsMobile());
    };

    // Handle Visual Viewport changes (useful for mobile browsers)
    const handleVisualViewportChange = () => {
      setIsMobile(checkIsMobile());
    };

    mql.addEventListener("change", onChange);
    setIsMobile(checkIsMobile());

    // Add Visual Viewport listener if supported
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleVisualViewportChange);
    }

    return () => {
      mql.removeEventListener("change", onChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleVisualViewportChange);
      }
    };
  }, []);

  return !!isMobile;
}
