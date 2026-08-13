import { useCallback, useEffect, useState } from "react"
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  TriangleAlert,
  UsersRound,
} from "lucide-react"
import { API_URL, ApiError, authApi, saveSession } from "../../../lib/api"

interface Props {
  onLogin: () => void
}

type ServerStatus = "checking" | "online" | "offline"
type LoginTheme = "light" | "dark"

const features = [
  {
    icon: Boxes,
    title: "Track assets",
    description: "Monitor all IT assets in real-time",
    tone: "green",
  },
  {
    icon: UsersRound,
    title: "Manage allocation",
    description: "Allocate and manage resources efficiently",
    tone: "blue",
  },
  {
    icon: BarChart3,
    title: "View reports",
    description: "Generate insights and detailed reports",
    tone: "purple",
  },
]

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [capsLock, setCapsLock] = useState(false)
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking")
  const [theme, setTheme] = useState<LoginTheme>(() => {
    const saved = localStorage.getItem("efu.loginTheme")
    if (saved === "light" || saved === "dark") return saved
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  })

  const checkServer = useCallback(async () => {
    setServerStatus("checking")
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 4000)

    try {
      const response = await fetch(`${API_URL}/health`, {
        cache: "no-store",
        signal: controller.signal,
      })
      setServerStatus(response.ok ? "online" : "offline")
    } catch {
      setServerStatus("offline")
    } finally {
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    void checkServer()
  }, [checkServer])

  useEffect(() => {
    localStorage.setItem("efu.loginTheme", theme)
  }, [theme])

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("resetToken")
    if (!token) return
    const next = window.prompt("Enter a new password (minimum 8 characters):")
    if (!next) return
    authApi
      .resetPassword(token, next)
      .then(() => {
        window.alert("Password reset successfully. You can now sign in.")
        window.history.replaceState({}, "", window.location.pathname)
      })
      .catch((e) => setError(e.message))
  }, [])

  const handleForgot = async () => {
    const address = window.prompt(
      "Enter the email address for your account:",
      email,
    )
    if (!address) return
    setError("")
    try {
      const result = await authApi.forgotPassword(address)
      if (result?.resetToken) {
        const next = window.prompt(
          "Development reset token created. Enter a new password:",
        )
        if (next) {
          await authApi.resetPassword(result.resetToken, next)
          window.alert("Password reset successfully.")
        }
      } else {
        window.alert(
          "If the account exists, a password-reset email will be sent.",
        )
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to request a password reset.",
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setError("Email address is required.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.")
      return
    }
    if (!password) {
      setError("Password is required.")
      return
    }

    setError("")
    setLoading(true)
    try {
      const session = await authApi.login(normalizedEmail, password)
      setServerStatus("online")
      saveSession(session, remember)
      onLogin()
    } catch (error) {
      if (error instanceof ApiError && error.status === 0)
        setServerStatus("offline")
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className={`login-page theme-${theme}`}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        event.currentTarget.style.setProperty(
          "--pointer-x",
          `${event.clientX - bounds.left}px`,
        )
        event.currentTarget.style.setProperty(
          "--pointer-y",
          `${event.clientY - bounds.top}px`,
        )
      }}
    >
      <div className="ambient-orb ambient-orb-one" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-two" aria-hidden="true" />
      <section className="login-shell">
        <aside className="login-hero">
          <div className="hero-photo hero-photo-day" aria-hidden="true" />
          <div className="hero-photo hero-photo-night" aria-hidden="true" />
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-grid-effect" aria-hidden="true" />

          <div className="hero-content">
            <header className="brand-row">
              <img
                src="/efu-login-logo.png"
                className="brand-logo"
                alt="EFU logo"
              />
              <div className="brand-copy">
                <div className="brand-title">EFU General Insurance</div>
                <div className="brand-subtitle">
                  IT Hardware Inventory System
                </div>
              </div>
            </header>

            <div className="hero-copy">
              <h1>
                IT Assets.
                <br />
                <span>
                  Managed
                  <br />
                  Better.
                </span>
              </h1>
              <div className="hero-accent" />
              <p>
                A secure and intelligent workspace to track, allocate and
                control your hardware inventory in <strong>real-time.</strong>
              </p>
            </div>

            <div className="feature-grid" aria-label="System capabilities">
              {features.map(({ icon: Icon, title, description, tone }) => (
                <article
                  className={`feature-card feature-card-${tone}`}
                  key={title}
                >
                  <div className="feature-icon">
                    <Icon size={25} strokeWidth={1.8} />
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <ArrowRight
                    size={20}
                    className="feature-arrow"
                    aria-hidden="true"
                  />
                </article>
              ))}
            </div>

          </div>
        </aside>

        <section className="login-side">
          <div className="login-card">
            <div className="login-card-topline">
              <div className="login-card-actions">
                <button
                  type="button"
                  className={`server-status server-status-${serverStatus}`}
                  onClick={() => void checkServer()}
                  aria-label={`Server status: ${serverStatus}. Click to check again.`}
                  title="Check server connection"
                >
                  <span className="server-dot" aria-hidden="true" />
                  <span>
                    {serverStatus === "checking"
                      ? "Checking"
                      : serverStatus === "online"
                        ? "Online"
                        : "Offline"}
                  </span>
                  <RefreshCw
                    size={13}
                    className={
                      serverStatus === "checking"
                        ? "server-refresh is-spinning"
                        : "server-refresh"
                    }
                  />
                </button>
                <button
                  type="button"
                  className="theme-toggle"
                  onClick={() =>
                    setTheme((current) =>
                      current === "dark" ? "light" : "dark",
                    )
                  }
                  aria-label={
                    theme === "dark"
                      ? "Switch to Light Mode"
                      : "Switch to Dark Mode"
                  }
                  aria-pressed={theme === "dark"}
                  title={
                    theme === "dark"
                      ? "Switch to Light Mode"
                      : "Switch to Dark Mode"
                  }
                >
                  {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
                  <span>{theme === "dark" ? "Dark" : "Light"}</span>
                </button>
              </div>
            </div>

            <div className="card-heading">
              <div className="card-logo-wrap">
                <div className="card-logo-glow" aria-hidden="true" />
                <img
                  src="/efu-login-logo.png"
                  className="card-logo"
                  alt="EFU logo"
                />
              </div>
              <h2>Welcome Back</h2>
              <p>Sign in to access your inventory workspace</p>
            </div>

            <div
              className="login-feedback"
              aria-live="polite"
              aria-atomic="true"
            >
              {error && (
                <div
                  id="login-feedback-message"
                  className="login-error"
                  role="alert"
                >
                  {error}
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="login-form"
              autoComplete="off"
            >
              <div className="field-group">
                <label htmlFor="login-email">Email Address</label>
                <div className="input-wrap">
                  <Mail size={20} strokeWidth={1.75} />
                  <input
                    id="login-email"
                    name="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError("")
                    }}
                    placeholder="Enter your email"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={Boolean(error) && !email.trim()}
                    aria-describedby={
                      error ? "login-feedback-message" : undefined
                    }
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="login-password">Password</label>
                <div className="input-wrap">
                  <LockKeyhole size={20} strokeWidth={1.75} />
                  <input
                    id="login-password"
                    name="efu-login-secret"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError("")
                    }}
                    onKeyDown={(e) =>
                      setCapsLock(e.getModifierState("CapsLock"))
                    }
                    onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLock(false)}
                    placeholder="Enter your password"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    aria-invalid={Boolean(error) && !password}
                    aria-describedby={
                      error ? "login-feedback-message" : undefined
                    }
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div
                  className={`password-assist ${capsLock ? "is-visible" : ""}`}
                  aria-live="polite"
                >
                  {capsLock && (
                    <>
                      <TriangleAlert size={13} />
                      <span>Caps Lock is on</span>
                    </>
                  )}
                </div>
              </div>

              <div className="form-options">
                <label className="remember-row">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Remember Me</span>
                </label>
                <button
                  type="button"
                  className="text-link"
                  onClick={handleForgot}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="primary-login"
                disabled={loading}
              >
                {loading ? (
                  <LoaderCircle size={21} className="login-spinner" />
                ) : (
                  <LockKeyhole size={21} strokeWidth={1.8} />
                )}
                <span>{loading ? "Signing In..." : "Sign In Securely"}</span>
                {!loading && (
                  <ArrowRight
                    size={20}
                    className="login-button-arrow"
                    aria-hidden="true"
                  />
                )}
              </button>
            </form>

            <footer className="login-footer">
              <span className="footer-security">
                <ShieldCheck size={14} />
                Secure company access
              </span>
              <span className="footer-meta">
                <span>Version 1.0</span>
              </span>
            </footer>
          </div>
        </section>
      </section>

      <style>{`
        .login-page {
          --pointer-x: 72%;
          --pointer-y: 26%;
          position: relative;
          isolation: isolate;
          min-height: 640px;
          height: 100dvh;
          width: 100%;
          display: grid;
          place-items: center;
          padding: clamp(12px, 1.4vw, 22px);
          overflow: clip;
          background:
            radial-gradient(circle at 12% 8%, rgba(15, 120, 226, 0.19), transparent 26%),
            linear-gradient(145deg, #04162f 0%, #062653 50%, #031a38 100%);
          color: #0b1731;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          transition: background 500ms ease, color 350ms ease;
        }

        .login-page::before {
          content: '';
          position: absolute;
          z-index: -2;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            420px circle at var(--pointer-x) var(--pointer-y),
            rgba(35, 145, 255, 0.15),
            transparent 72%
          );
          transition: background 80ms linear;
        }

        .login-page::after {
          content: '';
          position: absolute;
          z-index: -1;
          inset: 0;
          pointer-events: none;
          opacity: 0.21;
          background-image:
            linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at center, #000 0%, transparent 77%);
        }

        .ambient-orb {
          position: absolute;
          z-index: -1;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          opacity: 0.28;
          animation: ambient-drift 12s ease-in-out infinite alternate;
        }

        .ambient-orb-one {
          top: -140px;
          right: 8%;
          background: #087fe8;
        }

        .ambient-orb-two {
          bottom: -170px;
          left: 7%;
          background: #00a7c7;
          animation-delay: -5s;
        }

        .login-shell {
          position: relative;
          z-index: 1;
          width: min(1540px, 100%);
          height: min(920px, calc(100dvh - clamp(24px, 2.8vw, 44px)));
          min-height: 600px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) clamp(410px, 42vw, 560px);
          overflow: hidden;
          border: 1px solid rgba(169, 210, 248, 0.34);
          border-radius: 22px;
          background: #062652;
          box-shadow:
            0 30px 90px rgba(0, 8, 24, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          animation: shell-arrive 650ms cubic-bezier(.2,.8,.2,1) both;
          transition: background 500ms ease, border-color 500ms ease, box-shadow 500ms ease;
        }

        .login-hero {
          --hero-edge-color: #03152f;
          position: relative;
          min-width: 0;
          overflow: hidden;
          background: #062c5d;
        }

        .login-hero::after {
          content: '';
          position: absolute;
          z-index: 1;
          top: 0;
          right: 0;
          bottom: 0;
          width: 120px;
          pointer-events: none;
          background: linear-gradient(90deg, transparent 0%, var(--hero-edge-color) 65%);
          transition: background 500ms ease;
        }

        .hero-photo {
          position: absolute;
          inset: 0;
          background-repeat: no-repeat;
          background-size: auto 112%;
          background-position: left center;
          opacity: 0;
          transition: opacity 550ms ease;
        }

        .hero-photo-day {
          background-image: url('/efu-house-day.png');
        }

        .hero-photo-night {
          background-image: url('/efu-house-night.png');
        }

        .theme-light .hero-photo-day,
        .theme-dark .hero-photo-night {
          opacity: 1;
        }

        .theme-light .hero-photo-night,
        .theme-dark .hero-photo-day {
          opacity: 0;
        }

        .hero-shade {
          position: absolute;
          inset: 0;
          opacity: 0;
          background:
            linear-gradient(90deg, rgba(3, 30, 65, 0.97) 0%, rgba(3, 38, 81, 0.86) 39%, rgba(3, 43, 91, 0.35) 67%, rgba(3, 34, 73, 0.30) 100%),
            linear-gradient(0deg, rgba(2, 29, 65, 0.96) 0%, rgba(3, 42, 87, 0.55) 28%, rgba(3, 38, 79, 0.04) 68%);
        }

        .hero-grid-effect {
          position: absolute;
          left: -8%;
          right: -3%;
          bottom: -16%;
          height: 43%;
          opacity: 0;
          transform: perspective(650px) rotateX(62deg);
          transform-origin: center bottom;
          background-image:
            radial-gradient(circle, rgba(0, 126, 255, 0.9) 1.15px, transparent 1.35px);
          background-size: 11px 11px;
          mask-image: linear-gradient(to top, #000 12%, rgba(0,0,0,.86) 58%, transparent 100%);
        }

        .hero-content {
          position: relative;
          z-index: 2;
          height: 100%;
          padding: clamp(30px, 2.7vw, 44px) clamp(36px, 3.2vw, 50px);
          display: flex;
          flex-direction: column;
          color: #fff;
          opacity: 0;
          pointer-events: none;
          transition: opacity 480ms ease;
        }

        .brand-row {
          display: flex;
          align-items: center;
          gap: 17px;
        }

        .brand-logo {
          width: 60px;
          height: 60px;
          flex: 0 0 auto;
          object-fit: cover;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.92);
          background: #fff;
          box-shadow:
            0 0 0 2px rgba(16, 168, 199, 0.45),
            0 8px 24px rgba(8, 176, 222, 0.25);
        }

        .brand-copy {
          padding-top: 1px;
        }

        .brand-title {
          font-size: clamp(22px, 1.6vw, 28px);
          line-height: 1.15;
          font-weight: 700;
          letter-spacing: 0;
        }

        .brand-subtitle {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.65);
          font-size: 15px;
          font-weight: 400;
        }

        .hero-copy {
          margin-top: clamp(44px, 6.8vh, 70px);
          max-width: 510px;
        }

        .hero-kicker {
          width: fit-content;
          margin-bottom: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border: 1px solid rgba(125, 202, 255, 0.28);
          border-radius: 999px;
          color: #c9eaff;
          background: rgba(8, 90, 174, 0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
          font-size: 12px;
          line-height: 1;
          font-weight: 650;
          letter-spacing: 0.055em;
          text-transform: uppercase;
          backdrop-filter: blur(8px);
        }

        .hero-copy h1 {
          margin: 0;
          color: #f8fbff;
          font-size: clamp(58px, 4.65vw, 72px);
          line-height: 0.92;
          letter-spacing: -0.035em;
          font-weight: 850;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.15);
        }

        .hero-copy h1 span {
          color: #3b82f6;
          background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-accent {
          width: 55px;
          height: 3px;
          margin: 18px 0 20px;
          border-radius: 99px;
          background: linear-gradient(90deg, #3b82f6, #06b6d4);
        }

        .hero-copy p {
          margin: 0;
          max-width: 450px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 18px;
          line-height: 1.78;
          font-weight: 400;
        }

        .hero-copy p strong {
          color: #06b6d4;
          font-weight: 600;
        }

        .feature-strip {
          width: min(620px, 100%);
          margin-top: auto;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .feature-chip {
          min-height: 66px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px 14px;
          border: 1px solid rgba(218, 240, 255, 0.4);
          border-radius: 13px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(5, 48, 98, 0.58);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
          backdrop-filter: blur(10px);
          font-size: 13px;
          font-weight: 600;
          transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
          animation: feature-arrive 500ms cubic-bezier(.2,.8,.2,1) both;
        }

        .feature-chip:nth-child(2) {
          animation-delay: 70ms;
        }

        .feature-chip:nth-child(3) {
          animation-delay: 140ms;
        }

        .feature-chip svg {
          flex: 0 0 auto;
          color: #76c8ff;
        }

        .feature-chip:hover {
          transform: translateY(-3px);
          border-color: rgba(227, 246, 255, 0.78);
          background: rgba(8, 67, 134, 0.72);
        }

        .hero-trust-row {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 18px;
          color: rgba(233, 246, 255, 0.87);
          font-size: 12px;
          font-weight: 550;
        }

        .hero-trust-row span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .hero-trust-row i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #38e49b;
          box-shadow: 0 0 0 4px rgba(56, 228, 155, 0.12), 0 0 16px rgba(56, 228, 155, 0.55);
          animation: status-pulse 2s ease-in-out infinite;
        }

        .feature-grid {
          margin-top: 36px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          width: min(770px, 100%);
        }

        .feature-card {
          min-height: 180px;
          position: relative;
          padding: 24px 24px 25px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          background: rgba(8, 21, 38, 0.9);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 10px 30px rgba(0, 120, 255, 0.15);
          backdrop-filter: blur(14px);
          overflow: hidden;
          transition:
            transform 220ms cubic-bezier(.2,.8,.2,1),
            border-color 220ms ease,
            background 220ms ease,
            box-shadow 220ms ease;
          animation: feature-arrive 580ms cubic-bezier(.2,.8,.2,1) both;
        }

        .feature-card:nth-child(2) {
          animation-delay: 80ms;
        }

        .feature-card:nth-child(3) {
          animation-delay: 160ms;
        }

        .feature-card::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          background: linear-gradient(135deg, rgba(43, 160, 255, 0.2), transparent 48%);
          transition: opacity 220ms ease;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          border-color: rgba(104, 196, 255, 0.42);
          background: rgba(9, 27, 49, 0.95);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 18px 38px rgba(0, 89, 190, 0.24);
        }

        .feature-card:hover::before {
          opacity: 1;
        }

        .feature-card-top {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .feature-icon {
          width: 56px;
          height: 56px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
          transition: transform 220ms ease, box-shadow 220ms ease;
        }

        .feature-card-green .feature-icon {
          color: #35e6a1;
          background: linear-gradient(145deg, #0b2b1e, #092218);
        }

        .feature-card-blue .feature-icon {
          color: #45a7ff;
          background: linear-gradient(145deg, #0a1e38, #07172d);
        }

        .feature-card-purple .feature-icon {
          color: #a779ff;
          background: linear-gradient(145deg, #24123f, #190c2e);
        }

        .feature-card:hover .feature-icon {
          transform: rotate(-4deg) scale(1.06);
          box-shadow: 0 8px 20px rgba(0, 13, 44, 0.25);
        }

        .feature-number {
          color: rgba(188, 224, 255, 0.58);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
        }

        .feature-card h3 {
          margin: 18px 0 9px;
          color: #fff;
          font-size: clamp(18px, 1.4vw, 24px);
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: -0.015em;
        }

        .feature-card p {
          margin: 0;
          padding: 0 10px 28px 0;
          color: rgba(255, 255, 255, 0.65);
          font-size: 15px;
          line-height: 1.55;
        }

        .feature-arrow {
          position: absolute;
          right: 18px;
          bottom: 15px;
          color: #fff;
          transition: transform 220ms ease, color 220ms ease;
        }

        .feature-card:hover .feature-arrow {
          color: #73c8ff;
          transform: translateX(5px);
        }

        .feature-card-green .feature-arrow { color: #35e6a1; }
        .feature-card-blue .feature-arrow { color: #45a7ff; }
        .feature-card-purple .feature-arrow { color: #a779ff; }

        .login-side {
          position: relative;
          z-index: 3;
          grid-column: 2;
          width: 100%;
          display: grid;
          place-items: center;
          min-height: 0;
          padding: clamp(20px, 2.2vw, 34px);
          background: linear-gradient(90deg, rgba(5, 39, 83, 0.18), rgba(5, 31, 67, 0.36));
          overflow: hidden;
        }

        .login-side::before {
          content: '';
          position: absolute;
          width: 440px;
          height: 440px;
          top: -210px;
          left: -190px;
          border-radius: 50%;
          pointer-events: none;
          background: radial-gradient(circle, rgba(34, 150, 255, 0.16), transparent 68%);
          transition: opacity 500ms ease, background 500ms ease;
        }

        .login-card {
          position: relative;
          width: min(500px, 100%);
          max-height: 100%;
          min-height: 0;
          padding: 28px 36px 24px;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          border: 1px solid rgba(255, 255, 255, 0.88);
          border-radius: 30px;
          background:
            radial-gradient(circle at 100% 0%, rgba(49, 151, 255, 0.08), transparent 31%),
            linear-gradient(155deg, #ffffff 0%, #f8fbff 100%);
          box-shadow:
            0 30px 80px rgba(0, 10, 36, 0.28),
            0 8px 24px rgba(0, 64, 128, 0.08),
            inset 0 1px 0 rgba(255,255,255,.98);
          backdrop-filter: blur(28px) saturate(1.08);
          animation: card-arrive 700ms 80ms cubic-bezier(.2,.8,.2,1) both;
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 72px;
          right: 72px;
          height: 3px;
          border-radius: 0 0 999px 999px;
          background: linear-gradient(90deg, transparent, #1685e9 25%, #48c8ff 50%, #1685e9 75%, transparent);
          box-shadow: 0 2px 16px rgba(22, 133, 233, 0.32);
        }

        .login-card-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .login-card-actions {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .server-status,
        .theme-toggle {
          min-height: 31px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          font-size: 11px;
          line-height: 1;
          font-weight: 650;
          letter-spacing: 0.02em;
        }

        .theme-toggle {
          min-width: 69px;
          justify-content: center;
          padding: 6px 10px;
          border: 1px solid #cad8e8;
          color: #1a4f86;
          background: rgba(244, 249, 255, 0.94);
          cursor: pointer;
          transition:
            color 220ms ease,
            background 350ms ease,
            border-color 350ms ease,
            box-shadow 220ms ease,
            transform 160ms ease;
        }

        .theme-toggle:hover {
          transform: translateY(-1px);
          border-color: #9dbbdd;
          box-shadow: 0 5px 13px rgba(13, 76, 142, 0.12);
        }

        .theme-toggle:focus-visible {
          outline: 3px solid rgba(12, 98, 204, 0.17);
          outline-offset: 2px;
        }

        .server-status {
          padding: 6px 9px 6px 11px;
          border: 1px solid #d9e4ef;
          color: #51637b;
          background: rgba(255,255,255,.82);
          cursor: pointer;
          transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
        }

        .server-status:hover {
          transform: translateY(-1px);
          border-color: #aec5dc;
          background: #fff;
        }

        .server-status:focus-visible {
          outline: 3px solid rgba(12, 98, 204, 0.17);
          outline-offset: 2px;
        }

        .server-status-online {
          color: #197249;
          border-color: #c8ead9;
          background: #f0fbf5;
        }

        .server-status-offline {
          color: #a83b42;
          border-color: #f2c9cc;
          background: #fff4f4;
        }

        .server-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #9aa9ba;
          box-shadow: 0 0 0 3px rgba(154,169,186,.13);
        }

        .server-status-online .server-dot {
          background: #28b56f;
          box-shadow: 0 0 0 3px rgba(40,181,111,.12);
          animation: status-pulse 2s ease-in-out infinite;
        }

        .server-status-offline .server-dot {
          background: #e0555e;
          box-shadow: 0 0 0 3px rgba(224,85,94,.12);
        }

        .server-refresh {
          margin-left: 1px;
          opacity: .66;
        }

        .is-spinning,
        .login-spinner {
          animation: spin 800ms linear infinite;
        }

        .card-heading {
          margin-top: 18px;
          text-align: center;
        }

        .card-logo-wrap {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto;
          display: grid;
          place-items: center;
        }

        .card-logo-glow {
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          background: rgba(19, 124, 217, 0.28);
          filter: blur(13px);
          animation: logo-glow 2.8s ease-in-out infinite alternate;
        }

        .card-logo {
          width: 72px;
          height: 72px;
          position: relative;
          display: block;
          margin: 0 auto;
          object-fit: cover;
          border-radius: 50%;
          border: 1px solid rgba(13, 125, 151, 0.48);
          background: #fff;
          filter: drop-shadow(0 8px 15px rgba(1, 40, 79, 0.18));
        }

        .card-heading h2 {
          margin: 10px 0 6px;
          color: #0c1833;
          font-size: 32px;
          line-height: 1.1;
          font-weight: 760;
          letter-spacing: -0.035em;
        }

        .card-heading p {
          margin: 0;
          color: #52627d;
          font-size: 14.5px;
          line-height: 1.48;
        }

        .card-heading::after {
          content: '';
          width: 42px;
          height: 3px;
          display: block;
          margin: 16px auto 0;
          border-radius: 999px;
          background: linear-gradient(90deg, #1778ff, #25d4c5);
          box-shadow: 0 3px 12px rgba(25, 143, 235, 0.22);
        }

        .login-feedback {
          min-height: 35px;
          margin-top: 7px;
          display: flex;
          align-items: flex-end;
        }

        .login-feedback:not(:has(.login-error)) {
          min-height: 30px;
        }

        .login-error {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fff1f2;
          color: #be123c;
          font-size: 13px;
          animation: feedback-arrive 220ms ease both;
        }

        .login-form {
          margin-top: 11px;
        }

        .field-group + .field-group {
          margin-top: 16px;
        }

        .field-group label {
          display: block;
          margin-bottom: 6px;
          color: #10172a;
          font-size: 14px;
          line-height: 1;
          font-weight: 600;
        }

        .input-wrap {
          height: 56px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 15px;
          border: 1px solid #d3dce9;
          border-radius: 12px;
          color: #53637f;
          background: rgba(255,255,255,.88);
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease,
            background 160ms ease,
            transform 160ms ease;
        }

        .input-wrap:hover {
          border-color: #afc3d9;
          background: #fff;
        }

        .input-wrap:focus-within {
          border-color: #1265c3;
          box-shadow:
            0 0 0 3px rgba(18, 101, 195, 0.12),
            0 8px 20px rgba(14, 87, 169, 0.08);
          background: #ffffff;
          transform: translateY(-1px);
        }

        .input-wrap input {
          min-width: 0;
          flex: 1;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #455673;
          font: inherit;
          font-size: 15px;
        }

        .input-wrap input::placeholder {
          color: #93a0b3;
        }

        /* Keep Chrome/Edge autofilled credentials visually identical to normal inputs. */
        .input-wrap input:-webkit-autofill,
        .input-wrap input:-webkit-autofill:hover,
        .input-wrap input:-webkit-autofill:focus,
        .input-wrap input:-webkit-autofill:active {
          -webkit-text-fill-color: #455673 !important;
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          box-shadow: 0 0 0 1000px #ffffff inset !important;
          caret-color: #455673 !important;
          background-color: #ffffff !important;
          background-clip: content-box !important;
          transition: background-color 9999s ease-out 0s;
        }

        .input-wrap input:autofill {
          color: #455673 !important;
          box-shadow: 0 0 0 1000px #ffffff inset !important;
          background-color: #ffffff !important;
        }

        .icon-button {
          width: 34px;
          height: 34px;
          margin-right: -7px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #52627e;
          cursor: pointer;
          transition: color 150ms ease, background 150ms ease;
        }

        .icon-button:hover,
        .icon-button:focus-visible {
          color: #075bb7;
          background: #eef5ff;
          outline: none;
        }

        .password-assist {
          height: 18px;
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
          color: #a45a08;
          font-size: 11px;
          font-weight: 550;
          opacity: 0;
          transform: translateY(-3px);
          transition: opacity 150ms ease, transform 150ms ease;
        }

        .password-assist.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .form-options {
          margin: 10px 0 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .remember-row {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #111827;
          font-size: 13px;
          cursor: pointer;
        }

        .remember-row input {
          appearance: none;
          width: 18px;
          height: 18px;
          margin: 0;
          display: grid;
          place-items: center;
          border: 1px solid #9eb1ca;
          border-radius: 4px;
          background: #fff;
          cursor: pointer;
        }

        .remember-row input:checked {
          border-color: #0860c8;
          background: #0860c8;
        }

        .remember-row input:checked::after {
          content: '';
          width: 8px;
          height: 4px;
          margin-top: -2px;
          border-left: 2px solid #fff;
          border-bottom: 2px solid #fff;
          transform: rotate(-45deg);
        }

        .text-link {
          padding: 4px 0;
          border: 0;
          background: transparent;
          color: #065ed0;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .text-link:hover,
        .text-link:focus-visible {
          color: #003f93;
          text-decoration: underline;
          outline: none;
        }

        .primary-login {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(100deg, #1266e8 0%, #168fe7 52%, #1ac6c4 100%);
          color: #fff;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(14, 105, 205, 0.25);
          transition: transform 140ms ease, box-shadow 160ms ease, filter 160ms ease;
        }

        .primary-login::before {
          content: '';
          position: absolute;
          top: -70%;
          bottom: -70%;
          left: -35%;
          width: 26%;
          transform: rotate(18deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.33), transparent);
          transition: left 500ms ease;
        }

        .primary-login:hover:not(:disabled)::before {
          left: 115%;
        }

        .primary-login:hover:not(:disabled) {
          filter: brightness(1.05);
          box-shadow: 0 10px 22px rgba(6, 79, 166, 0.27);
          transform: translateY(-1px);
        }

        .primary-login:active:not(:disabled) {
          transform: translateY(0);
        }

        .primary-login:focus-visible {
          outline: 3px solid rgba(12, 98, 204, 0.25);
          outline-offset: 2px;
        }

        .primary-login:disabled {
          cursor: wait;
          opacity: 0.68;
        }

        .login-button-arrow {
          position: absolute;
          right: 18px;
          transition: transform 180ms ease;
        }

        .primary-login:hover:not(:disabled) .login-button-arrow {
          transform: translateX(4px);
        }

        .alternative-login {
          margin-top: 17px;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          color: #74839a;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .09em;
          text-transform: uppercase;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          height: 1px;
          flex: 1;
          background: #d8e1eb;
        }

        .google-login {
          width: 100%;
          height: 50px;
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 1px solid #cfd9e6;
          border-radius: 12px;
          color: #17243b;
          background: rgba(255, 255, 255, 0.92);
          font: inherit;
          font-size: 15px;
          font-weight: 650;
          cursor: pointer;
          box-shadow: 0 5px 16px rgba(21, 53, 82, 0.07);
          transition:
            transform 160ms ease,
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .google-login:hover {
          transform: translateY(-1px);
          border-color: #9fb4cd;
          background: #fff;
          box-shadow: 0 9px 22px rgba(21, 77, 125, 0.12);
        }

        .google-login:focus-visible {
          outline: 3px solid rgba(30, 111, 222, 0.16);
          outline-offset: 2px;
        }

        .google-mark {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #fff;
          color: transparent;
          font-size: 19px;
          line-height: 1;
          font-weight: 850;
          background-image: conic-gradient(
            from -45deg,
            #4285f4 0 25%,
            #34a853 25% 45%,
            #fbbc05 45% 68%,
            #ea4335 68% 82%,
            #4285f4 82% 100%
          );
          background-clip: text;
          -webkit-background-clip: text;
          filter: drop-shadow(0 2px 3px rgba(25, 71, 116, 0.12));
        }

        .or-divider {
          margin: 18px 0 16px;
          display: flex;
          align-items: center;
          gap: 18px;
          color: #131a2a;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
        }

        .or-divider::before,
        .or-divider::after {
          content: '';
          height: 1px;
          flex: 1;
          background: #d5ddea;
        }

        .microsoft-button {
          position: relative;
          width: 100%;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          border: 1px solid #d1dae7;
          border-radius: 8px;
          background: #fff;
          color: #101827;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 3px 8px rgba(16, 24, 40, 0.05);
          transition: border-color 160ms ease, background 160ms ease, transform 140ms ease;
        }

        .microsoft-button:hover:not(:disabled) {
          border-color: #aebdd0;
          background: #f9fbfd;
          transform: translateY(-1px);
        }

        .microsoft-button:focus-visible {
          outline: 3px solid rgba(0, 91, 172, 0.15);
          outline-offset: 2px;
        }

        .microsoft-button:disabled {
          cursor: not-allowed;
          color: #66758d;
          background: #f8fafc;
          box-shadow: none;
          opacity: 0.78;
        }

        .sso-badge {
          position: absolute;
          top: -8px;
          right: 10px;
          padding: 4px 6px;
          border: 1px solid #d9e2ec;
          border-radius: 999px;
          color: #687991;
          background: #fff;
          font-size: 9px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: .035em;
          text-transform: uppercase;
        }

        .microsoft-mark {
          width: 27px;
          height: 27px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 2px;
          flex: 0 0 auto;
        }

        .microsoft-mark i:nth-child(1) { background: #f35325; }
        .microsoft-mark i:nth-child(2) { background: #81bc06; }
        .microsoft-mark i:nth-child(3) { background: #05a6f0; }
        .microsoft-mark i:nth-child(4) { background: #ffba08; }

        .login-footer {
          margin-top: 20px;
          padding-top: 0;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #5a6b86;
          font-size: 11px;
        }

        .footer-security,
        .footer-meta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .footer-security {
          gap: 6px;
          color: #3e5874;
          font-weight: 550;
        }

        .footer-security svg {
          color: #1670bc;
        }

        .footer-meta {
          flex-wrap: wrap;
          gap: 8px;
          color: #7a899d;
        }

        .footer-meta::before {
          content: '';
          width: 3px;
          height: 3px;
          margin-right: 1px;
          border-radius: 50%;
          background: #aebac8;
        }

        .footer-meta i {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #aebac8;
        }

        .login-side,
        .login-card,
        .card-heading h2,
        .card-heading p,
        .field-group label,
        .remember-row,
        .text-link,
        .login-footer,
        .footer-security,
        .footer-meta,
        .microsoft-button,
        .sso-badge,
        .or-divider {
          transition:
            color 400ms ease,
            background-color 500ms ease,
            border-color 500ms ease,
            box-shadow 500ms ease;
        }

        .login-page.theme-light {
          color-scheme: light;
          background-color: #eaf6fb;
          background-image: url('/efu-house-day.png');
          background-repeat: no-repeat;
          background-position: center center;
          background-size: cover;
        }

        .login-page.theme-light::before,
        .login-page.theme-light::after {
          opacity: 0;
        }

        .theme-light .ambient-orb {
          opacity: 0;
        }

        .theme-light .login-shell {
          border-color: rgba(255, 255, 255, 0.62);
          background: transparent;
          box-shadow: none;
        }

        .theme-light .login-hero {
          --hero-edge-color: #eff8fc;
          background: transparent;
        }

        .login-page.theme-light .hero-photo-day {
          opacity: 0;
        }

        .theme-light .hero-content {
          opacity: 1;
          pointer-events: auto;
        }

        .theme-light .hero-shade {
          display: none;
        }

        .theme-light .brand-title,
        .theme-light .hero-copy h1 {
          color: #ffffff;
          text-shadow:
            0 2px 3px rgba(0, 25, 58, 0.72),
            0 7px 22px rgba(0, 25, 58, 0.3);
        }

        .theme-light .hero-copy h1 span {
          color: #51dcff;
          background: none;
          background-clip: border-box;
          -webkit-background-clip: border-box;
          -webkit-text-fill-color: #51dcff;
          text-shadow:
            0 2px 3px rgba(0, 32, 66, 0.74),
            0 0 18px rgba(0, 77, 140, 0.34);
          filter: none;
        }

        .theme-light .brand-subtitle {
          color: rgba(238, 248, 255, 0.94);
          text-shadow: 0 2px 7px rgba(0, 25, 58, 0.72);
        }

        .theme-light .hero-copy p {
          color: #ffffff;
          font-weight: 600;
          text-shadow: 0 2px 6px rgba(0, 25, 58, 0.8);
        }

        .theme-light .hero-copy p strong {
          color: #57e8ff;
        }

        .theme-light .feature-card {
          border-color: rgba(65, 108, 140, 0.24);
          background: #f8fbff;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 16px 34px rgba(0, 25, 58, 0.22);
        }

        .theme-light .feature-card-green {
          background: linear-gradient(145deg, #f5fffb 0%, #e6f8f1 100%);
          border-color: rgba(12, 167, 114, 0.24);
        }

        .theme-light .feature-card-blue {
          background: linear-gradient(145deg, #f7fbff 0%, #e5f1ff 100%);
          border-color: rgba(20, 121, 232, 0.24);
        }

        .theme-light .feature-card-purple {
          background: linear-gradient(145deg, #fbf9ff 0%, #eee9ff 100%);
          border-color: rgba(118, 80, 232, 0.24);
        }

        .theme-light .feature-card:hover {
          border-color: rgba(40, 133, 195, 0.35);
          background: rgba(255, 255, 255, 0.96);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 18px 38px rgba(27, 99, 148, 0.2);
        }

        .theme-light .feature-card h3 {
          color: #10213a;
        }

        .theme-light .feature-card p {
          color: rgba(16, 33, 58, 0.68);
        }

        .theme-light .feature-card-green .feature-icon {
          color: #0ca772;
          background: linear-gradient(145deg, #e5f9f1, #d8f4e8);
        }

        .theme-light .feature-card-blue .feature-icon {
          color: #1479e8;
          background: linear-gradient(145deg, #e9f3ff, #dcecff);
        }

        .theme-light .feature-card-purple .feature-icon {
          color: #7650e8;
          background: linear-gradient(145deg, #f0ecff, #e5defd);
        }

        .theme-light .login-side {
          background: transparent;
        }

        .theme-light .login-side::before {
          opacity: 0;
        }

        .theme-light .login-card {
          border-color: rgba(207, 224, 238, 0.95);
          background:
            radial-gradient(circle at 100% 0%, rgba(62, 173, 236, 0.1), transparent 31%),
            linear-gradient(155deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 252, 255, 0.98) 100%);
          box-shadow:
            0 28px 68px rgba(58, 94, 119, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        }

        .theme-light .theme-toggle {
          border-color: #c9d9e9;
          color: #1d5c94;
          background: #f2f8fd;
        }

        .theme-light .primary-login {
          background: linear-gradient(100deg, #1468ee 0%, #168fea 55%, #20c8c6 100%);
          box-shadow: 0 13px 30px rgba(21, 120, 218, 0.27);
        }

        @media (min-width: 961px) {
          .login-page.theme-light {
            padding: 0;
          }

          .theme-light .login-shell {
            width: 100%;
            height: 100dvh;
            max-width: none;
            border: 0;
            border-radius: 0;
            grid-template-columns: minmax(0, 1fr) clamp(410px, 42vw, 560px);
            box-shadow: none;
          }

          .theme-light .login-hero::after {
            display: none;
          }
        }

        .login-page.theme-dark {
          color-scheme: dark;
          background-color: #020b1d;
          background-image: url('/efu-house-night.png');
          background-repeat: no-repeat;
          background-position: center center;
          background-size: cover;
        }

        .login-page.theme-dark::before,
        .login-page.theme-dark::after {
          opacity: 0;
        }

        .theme-dark .ambient-orb {
          opacity: 0;
        }

        .theme-dark .login-shell {
          border-color: rgba(111, 169, 224, 0.48);
          background: transparent;
          box-shadow: inset 0 1px 0 rgba(159, 210, 255, 0.09);
        }

        .theme-dark .login-hero {
          --hero-edge-color: #03142d;
          background: transparent;
        }

        .login-page.theme-dark .hero-photo-night {
          opacity: 0;
        }

        .theme-dark .login-hero::after {
          display: none;
        }

        .theme-dark .hero-content {
          opacity: 1;
          pointer-events: auto;
        }

        .theme-dark .login-side {
          background: transparent;
        }

        .theme-dark .login-side::before {
          opacity: 0;
        }

        @media (min-width: 961px) {
          .login-page.theme-dark {
            padding: 0;
          }

          .theme-dark .login-shell {
            width: 100%;
            height: 100dvh;
            max-width: none;
            border: 0;
            border-radius: 0;
          }
        }

        .theme-dark .login-card {
          border-color: rgba(126, 190, 246, 0.78);
          background:
            radial-gradient(circle at 4% 0%, rgba(63, 145, 244, 0.2), transparent 37%),
            radial-gradient(circle at 100% 100%, rgba(28, 208, 207, 0.1), transparent 38%),
            linear-gradient(155deg, rgba(7, 31, 66, 0.985) 0%, rgba(2, 14, 33, 0.995) 100%);
          box-shadow:
            0 34px 90px rgba(0, 3, 15, 0.68),
            0 0 34px rgba(32, 131, 234, 0.12),
            inset 0 1px 0 rgba(190, 226, 255, 0.17);
        }

        .theme-dark .login-card::before {
          background: linear-gradient(90deg, transparent, #287cff 25%, #29e0d0 50%, #287cff 75%, transparent);
          box-shadow: 0 2px 18px rgba(33, 157, 255, 0.45);
        }

        .theme-dark .server-status,
        .theme-dark .theme-toggle {
          color: #c7d9ec;
          border-color: rgba(97, 133, 174, 0.47);
          background: rgba(4, 23, 50, 0.72);
        }

        .theme-dark .theme-toggle {
          color: #c5e5ff;
          border-color: rgba(69, 151, 231, 0.58);
          background: rgba(20, 75, 139, 0.38);
        }

        .theme-dark .server-status:hover,
        .theme-dark .theme-toggle:hover {
          border-color: rgba(116, 190, 255, 0.78);
          background: rgba(16, 55, 101, 0.86);
        }

        .theme-dark .server-status-online {
          color: #65efb1;
          border-color: rgba(44, 194, 126, 0.36);
          background: rgba(15, 104, 68, 0.24);
        }

        .theme-dark .server-status-offline {
          color: #ff9da4;
          border-color: rgba(235, 91, 103, 0.4);
          background: rgba(119, 31, 45, 0.24);
        }

        .theme-dark .card-logo {
          filter: drop-shadow(0 8px 18px rgba(48, 181, 255, 0.22));
        }

        .theme-dark .card-heading h2,
        .theme-dark .field-group label,
        .theme-dark .remember-row,
        .theme-dark .or-divider {
          color: #f4f8ff;
        }

        .theme-dark .card-heading p {
          color: #b8c8dc;
        }

        .theme-dark .input-wrap {
          color: #a9bdd6;
          border-color: #3c5f82;
          background: rgba(3, 20, 45, 0.96);
        }

        .theme-dark .input-wrap:hover {
          border-color: #5a82aa;
          background: rgba(5, 28, 59, 0.99);
        }

        .theme-dark .input-wrap:focus-within {
          border-color: #3ba3ff;
          background: #061e3f;
          box-shadow: 0 0 0 3px rgba(43, 157, 255, 0.16);
        }

        .theme-dark .input-wrap input {
          color: #eef6ff;
        }

        .theme-dark .input-wrap input::placeholder {
          color: #7f94ad;
        }

        .theme-dark .input-wrap input:-webkit-autofill,
        .theme-dark .input-wrap input:-webkit-autofill:hover,
        .theme-dark .input-wrap input:-webkit-autofill:focus,
        .theme-dark .input-wrap input:-webkit-autofill:active {
          -webkit-text-fill-color: #eef6ff !important;
          -webkit-box-shadow: 0 0 0 1000px #061e3f inset !important;
          box-shadow: 0 0 0 1000px #061e3f inset !important;
          caret-color: #eef6ff !important;
          background-color: #061e3f !important;
        }

        .theme-dark .input-wrap input:autofill {
          color: #eef6ff !important;
          box-shadow: 0 0 0 1000px #061e3f inset !important;
          background-color: #061e3f !important;
        }

        .theme-dark .icon-button {
          color: #a8bfd8;
        }

        .theme-dark .icon-button:hover,
        .theme-dark .icon-button:focus-visible {
          color: #69c4ff;
          background: rgba(35, 111, 188, 0.24);
        }

        .theme-dark .remember-row input {
          border-color: #6081a5;
          background: #061b38;
        }

        .theme-dark .remember-row input:checked {
          border-color: #1d82eb;
          background: #1d82eb;
        }

        .theme-dark .text-link {
          color: #51b5ff;
        }

        .theme-dark .text-link:hover,
        .theme-dark .text-link:focus-visible {
          color: #91d2ff;
        }

        .theme-dark .login-error {
          border-color: rgba(248, 113, 113, 0.48);
          color: #ffb4b4;
          background: rgba(127, 29, 29, 0.28);
        }

        .theme-dark .primary-login {
          background: linear-gradient(100deg, #1762ff 0%, #148fe8 52%, #23cfbd 100%);
          box-shadow:
            0 13px 30px rgba(16, 108, 226, 0.3),
            0 0 22px rgba(31, 198, 202, 0.09);
        }

        .theme-dark .auth-divider {
          color: #7890aa;
        }

        .theme-dark .auth-divider::before,
        .theme-dark .auth-divider::after {
          background: #2d4866;
        }

        .theme-dark .google-login {
          border-color: #3d5f82;
          color: #eef6ff;
          background: rgba(4, 23, 50, 0.94);
          box-shadow: inset 0 1px 0 rgba(174, 215, 255, 0.07);
        }

        .theme-dark .google-login:hover {
          border-color: #638db8;
          background: #08274f;
          box-shadow:
            inset 0 1px 0 rgba(174, 215, 255, 0.1),
            0 10px 24px rgba(0, 7, 21, 0.28);
        }

        .theme-dark .or-divider::before,
        .theme-dark .or-divider::after {
          background: #304a68;
        }

        .theme-dark .microsoft-button {
          border-color: #405f80;
          color: #eef6ff;
          background: rgba(3, 20, 45, 0.82);
          box-shadow: none;
        }

        .theme-dark .microsoft-button:hover:not(:disabled) {
          border-color: #6388ae;
          background: #09284f;
        }

        .theme-dark .microsoft-button:disabled {
          color: #9aadc3;
          background: rgba(3, 20, 45, 0.68);
        }

        .theme-dark .sso-badge {
          border-color: #3b5878;
          color: #aebfd3;
          background: #061b38;
        }

        .theme-dark .login-footer,
        .theme-dark .footer-meta {
          color: #869bb4;
        }

        .theme-dark .footer-security {
          color: #adc2d9;
        }

        .theme-dark .footer-security svg {
          color: #46aefb;
        }

        .theme-dark .footer-meta::before,
        .theme-dark .footer-meta i {
          background: #57718e;
        }

        @keyframes shell-arrive {
          from { opacity: 0; transform: translateY(12px) scale(.992); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes card-arrive {
          from { opacity: 0; transform: translateX(18px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes feature-arrive {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes feedback-arrive {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes hero-breathe {
          from { transform: scale(1.015); }
          to { transform: scale(1.045); }
        }

        @keyframes ambient-drift {
          from { transform: translate3d(-18px, -8px, 0) scale(.95); }
          to { transform: translate3d(22px, 16px, 0) scale(1.08); }
        }

        @keyframes status-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .7; transform: scale(.88); }
        }

        @keyframes logo-glow {
          from { opacity: .38; transform: scale(.92); }
          to { opacity: .72; transform: scale(1.08); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1280px) {
          .login-shell {
            grid-template-columns: minmax(0, 1fr) clamp(410px, 43vw, 520px);
          }

          .hero-content {
            padding-left: 38px;
            padding-right: 34px;
          }

          .hero-copy {
            margin-top: 50px;
          }

          .hero-copy h1 {
            font-size: clamp(41px, 4vw, 52px);
          }

          .feature-grid {
            gap: 14px;
          }

          .feature-card {
            min-height: 210px;
            padding: 17px 17px 20px;
          }

          .feature-card h3 {
            font-size: 16px;
          }

          .feature-card p {
            font-size: 13px;
          }

          .login-side {
            padding-left: 25px;
            padding-right: 25px;
          }

          .login-card {
            padding-left: 28px;
            padding-right: 28px;
          }
        }

        @media (max-width: 960px) {
          .login-page {
            overflow: auto;
            padding: 20px;
            height: auto;
          }

          .login-shell {
            height: auto;
            min-height: calc(100vh - 40px);
            grid-template-columns: 1fr;
            overflow: visible;
          }

          .login-hero {
            min-height: 560px;
          }

          .login-hero::after {
            display: none;
          }

          .hero-photo {
            background-size: auto 96%;
            background-position: 78% 50%;
          }

          .hero-copy {
            margin-top: 65px;
          }

          .login-side {
            grid-column: 1;
            order: -1;
            min-height: calc(100dvh - 40px);
            padding: 32px 24px;
          }

          .login-card {
            min-height: 0;
            width: min(560px, 100%);
          }
        }

        @media (max-width: 720px) {
          .login-page {
            padding: 0;
            background: #062652;
          }

          .login-shell {
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .login-hero {
            display: none;
          }

          .hero-content {
            padding: 30px 22px 28px;
          }

          .brand-logo {
            width: 66px;
            height: 66px;
          }

          .brand-title {
            font-size: 20px;
          }

          .brand-subtitle {
            font-size: 12px;
          }

          .hero-copy {
            margin-top: 55px;
          }

          .hero-copy h1 {
            font-size: clamp(38px, 11vw, 50px);
          }

          .hero-copy p {
            font-size: 14px;
          }

          .feature-grid {
            display: none;
          }

          .hero-photo {
            background-size: auto 85%;
            background-position: 88% 72%;
          }

          .hero-shade {
            background:
              linear-gradient(90deg, rgba(3, 30, 65, 0.97), rgba(3, 38, 81, 0.64)),
              linear-gradient(0deg, rgba(2, 29, 65, 0.8), rgba(3, 38, 79, 0.08));
          }

          .login-side {
            min-height: 100dvh;
            padding: 16px;
          }

          .login-card {
            width: min(460px, 100%);
            max-height: none;
            padding: 24px 22px 20px;
            border-radius: 18px;
          }

          .card-logo {
            width: 76px;
            height: 76px;
          }

          .card-heading h2 {
            font-size: 28px;
          }

        }

        @media (max-height: 860px) and (min-width: 1025px) {
          .login-shell {
            min-height: 680px;
          }

          .login-side {
            padding: 18px 24px;
          }

          .hero-content {
            padding-top: 30px;
            padding-bottom: 22px;
          }

          .brand-logo {
            width: 58px;
            height: 58px;
          }

          .hero-copy {
            margin-top: 28px;
          }

          .hero-copy h1 {
            font-size: 44px;
          }

          .hero-accent {
            margin-top: 14px;
            margin-bottom: 13px;
          }

          .hero-copy p {
            font-size: 14px;
            line-height: 1.55;
          }

          .feature-grid {
            margin-top: 20px;
            gap: 10px;
          }

          .feature-card {
            min-height: 142px;
            padding: 14px 14px 16px;
            border-radius: 15px;
          }

          .feature-icon {
            width: 42px;
            height: 42px;
          }

          .feature-card h3 {
            margin-top: 11px;
            margin-bottom: 6px;
            font-size: 15px;
          }

          .feature-card p {
            padding-right: 6px;
            padding-bottom: 18px;
            font-size: 11px;
            line-height: 1.4;
          }

          .feature-arrow {
            right: 14px;
            bottom: 12px;
          }

          .login-card {
            min-height: 0;
            padding: 18px 28px 16px;
          }

          .card-heading {
            margin-top: 8px;
          }

          .card-logo-wrap {
            width: 64px;
            height: 64px;
          }

          .card-logo {
            width: 58px;
            height: 58px;
          }

          .card-heading h2 {
            margin-top: 7px;
            font-size: 25px;
          }

          .card-heading p {
            font-size: 13px;
          }

          .card-heading::after {
            margin-top: 10px;
          }

          .login-feedback {
            margin-top: 4px;
          }

          .login-feedback:not(:has(.login-error)) {
            min-height: 16px;
          }

          .login-form {
            margin-top: 8px;
          }

          .field-group + .field-group {
            margin-top: 12px;
          }

          .input-wrap {
            height: 48px;
          }

          .form-options {
            margin: 5px 0 14px;
          }

          .primary-login {
            height: 52px;
          }

          .alternative-login {
            margin-top: 12px;
          }

          .google-login {
            height: 44px;
            margin-top: 10px;
          }

          .or-divider {
            margin: 16px 0 14px;
          }

          .login-footer {
            margin-top: 10px;
            padding-top: 0;
            gap: 5px;
          }
        }

        @media (max-width: 420px) {
          .sso-badge {
            display: none;
          }

          .form-options {
            align-items: flex-start;
            flex-direction: column;
            gap: 12px;
          }

          .text-link {
            align-self: flex-end;
            margin-top: -31px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-page *,
          .login-page *::before,
          .login-page *::after {
            scroll-behavior: auto !important;
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </main>
  )
}
