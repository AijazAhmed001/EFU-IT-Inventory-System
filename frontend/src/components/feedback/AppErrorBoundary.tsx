import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application page failed to render", error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f5f8fb" }}>
        <section role="alert" style={{ width: "min(100%, 520px)", padding: 28, border: "1px solid #fecaca", borderRadius: 16, background: "#fff", boxShadow: "0 12px 30px rgba(15,23,42,.08)", textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 21, color: "#991b1b" }}>This page could not be displayed</h1>
          <p style={{ margin: "10px 0 20px", color: "#596579", fontSize: 13 }}>The page encountered an unexpected display error. Your data was not changed.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 40, padding: "0 18px", border: 0, borderRadius: 10, background: "#005bac", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Reload page</button>
        </section>
      </main>
    )
  }
}
