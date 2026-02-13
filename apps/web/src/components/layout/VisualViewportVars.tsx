"use client";

import { useEffect } from "react";

const CSS_VAR_NAME = "--vv-offset-bottom";

function setViewportOffsetBottom() {
  if (typeof window === "undefined") {
    return;
  }

  const vv = window.visualViewport;
  const offsetBottom = vv
    ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
    : 0;

  document.documentElement.style.setProperty(CSS_VAR_NAME, `${offsetBottom}px`);
}

export default function VisualViewportVars() {
  useEffect(() => {
    const vv = window.visualViewport;

    setViewportOffsetBottom();

    vv?.addEventListener("resize", setViewportOffsetBottom);
    vv?.addEventListener("scroll", setViewportOffsetBottom);
    window.addEventListener("resize", setViewportOffsetBottom);
    window.addEventListener("orientationchange", setViewportOffsetBottom);

    return () => {
      vv?.removeEventListener("resize", setViewportOffsetBottom);
      vv?.removeEventListener("scroll", setViewportOffsetBottom);
      window.removeEventListener("resize", setViewportOffsetBottom);
      window.removeEventListener("orientationchange", setViewportOffsetBottom);
    };
  }, []);

  return null;
}
