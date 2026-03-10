import type { Metadata } from "next"
import { V0SandboxClient } from "./v0-sandbox-client"

export const metadata: Metadata = {
  title: "v0 Sandbox",
  robots: {
    index: false,
    follow: false,
  },
}

export default function V0SandboxPage() {
  return <V0SandboxClient />
}
