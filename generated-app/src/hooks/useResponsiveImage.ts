import { useEffect, useState } from "react";
import type { Car } from "@/types";

function getBreakpoint(width: number): "mobile" | "tablet" | "desktop" {
  if (width <= 640) return "mobile";
  if (width <= 1023) return "tablet";
  return "desktop";
}

export function useResponsiveImage(car: Car): string {
  const [breakpoint, setBreakpoint] = useState<"mobile" | "tablet" | "desktop">(() =>
    getBreakpoint(typeof window !== "undefined" ? window.innerWidth : 1024),
  );

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getBreakpoint(window.innerWidth));
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  switch (breakpoint) {
    case "mobile":
      return car.mobile;
    case "tablet":
      return car.tablet;
    case "desktop":
      return car.desktop;
  }
}
