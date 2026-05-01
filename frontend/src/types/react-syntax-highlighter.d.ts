declare module "react-syntax-highlighter" {
  import type { ComponentType } from "react"
  export const Prism: ComponentType<Record<string, unknown>>
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  const styles: Record<string, unknown>
  export const vscDarkPlus: typeof styles
  export default styles
}
