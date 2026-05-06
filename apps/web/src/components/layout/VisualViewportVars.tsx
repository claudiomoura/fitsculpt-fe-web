"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import { useEffect } from "react";

const CSS_VAR_NAME = "--vv-offset-bottom";
const SAFE_AREA_TOP_VAR_NAME = "--native-safe-area-top";
const SAFE_AREA_RIGHT_VAR_NAME = "--native-safe-area-right";
const SAFE_AREA_BOTTOM_VAR_NAME = "--native-safe-area-bottom";
const SAFE_AREA_LEFT_VAR_NAME = "--native-safe-area-left";
const NATIVE_PLATFORM_ATTR = "data-native-platform";

type ShellInsetsPlugin = {
  getInsets: () => Promise<{
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  }>;
};

const ShellInsets = registerPlugin<ShellInsetsPlugin>("ShellInsets");

function setCssPixelVar(name: string, value: number) {
  document.documentElement.style.setProperty(name, `${Math.max(0, value)}px`);
}

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

async function setNativeSafeAreaInsets() {
  if (typeof document === "undefined") {
    return;
  }

  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    setCssPixelVar(SAFE_AREA_TOP_VAR_NAME, 0);
    setCssPixelVar(SAFE_AREA_RIGHT_VAR_NAME, 0);
    setCssPixelVar(SAFE_AREA_BOTTOM_VAR_NAME, 0);
    setCssPixelVar(SAFE_AREA_LEFT_VAR_NAME, 0);
    return;
  }

  try {
    const insets = await ShellInsets.getInsets();
    setCssPixelVar(SAFE_AREA_TOP_VAR_NAME, insets.top ?? 0);
    setCssPixelVar(SAFE_AREA_RIGHT_VAR_NAME, insets.right ?? 0);
    setCssPixelVar(SAFE_AREA_BOTTOM_VAR_NAME, insets.bottom ?? 0);
    setCssPixelVar(SAFE_AREA_LEFT_VAR_NAME, insets.left ?? 0);
  } catch {
    setCssPixelVar(SAFE_AREA_TOP_VAR_NAME, 0);
    setCssPixelVar(SAFE_AREA_RIGHT_VAR_NAME, 0);
    setCssPixelVar(SAFE_AREA_BOTTOM_VAR_NAME, 0);
    setCssPixelVar(SAFE_AREA_LEFT_VAR_NAME, 0);
  }
}

export default function VisualViewportVars() {
  useEffect(() => {
    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
    document.documentElement.setAttribute(NATIVE_PLATFORM_ATTR, isNativeAndroid ? "android" : "web");

    const vv = window.visualViewport;
    const refreshInsets = () => {
      setViewportOffsetBottom();
      void setNativeSafeAreaInsets();
    };

    refreshInsets();

    vv?.addEventListener("resize", refreshInsets);
    vv?.addEventListener("scroll", refreshInsets);
    window.addEventListener("resize", refreshInsets);
    window.addEventListener("orientationchange", refreshInsets);

    return () => {
      vv?.removeEventListener("resize", refreshInsets);
      vv?.removeEventListener("scroll", refreshInsets);
      window.removeEventListener("resize", refreshInsets);
      window.removeEventListener("orientationchange", refreshInsets);
    };
  }, []);

  return null;
}
