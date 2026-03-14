import { Eye, EyeOff } from "lucide-react";
import AuthField from "./AuthField";

export default function AuthForm({
  auth,
  update,
  showPassword,
  setShowPassword,
  AuthTestComponent,
}) {
  return (
    <div className="relative max-w-6xl mx-auto p-6 transition-all duration-500">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 size-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Core Auth Info */}
        <div className="space-y-8">
          <section className="space-y-6 p-8 rounded-3xl bg-black/20 border border-white/5 backdrop-blur-xl shadow-2xl">
            <div className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">
              Endpoint Configuration
            </div>
            <AuthField
              label="Login URL"
              tooltip="The URL of the login page/endpoint (e.g. https://target.com/login)"
              value={auth.loginUrl}
              onChange={(v) => update("loginUrl", v)}
              placeholder="https://target.com/login"
              required
            />
          </section>

          <section className="space-y-6 p-8 rounded-3xl bg-black/20 border border-white/5 backdrop-blur-xl shadow-2xl">
            <div className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">
              Authentication Details
            </div>
            <div className="space-y-6">
              <AuthField
                label="Username Field name"
                tooltip='The name attribute of the username input field (e.g. "username", "email")'
                value={auth.usernameField}
                onChange={(v) => update("usernameField", v)}
                placeholder="username"
              />
              <AuthField
                label="Password Field name"
                tooltip='The name attribute of the password input field (e.g. "password")'
                value={auth.passwordField}
                onChange={(v) => update("passwordField", v)}
                placeholder="password"
              />

              <AuthField
                label="Login Username"
                tooltip="The actual username/email to log in with"
                value={auth.username}
                onChange={(v) => update("username", v)}
                placeholder="admin@example.com"
                required
              />
              <AuthField
                label="Login Password"
                tooltip="The actual password to log in with"
                value={auth.password}
                onChange={(v) => update("password", v)}
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                required
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-primary-400 hover:text-white transition-all cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                }
              />
            </div>
          </section>
        </div>

        {/* Right Column: Advanced & Indicators */}
        <div className="space-y-8">
          <section className="space-y-6 p-8 rounded-3xl bg-black/20 border border-white/5 backdrop-blur-xl shadow-2xl">
            <div className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">
              Session Indicators
            </div>
            <div className="space-y-6">
              <AuthField
                label="Logged-In Indicator"
                tooltip='Regex pattern ZAP looks for to confirm it is logged in (e.g. "Logout")'
                value={auth.loggedInIndicator}
                onChange={(v) => update("loggedInIndicator", v)}
                placeholder="Logout|Dashboard|Welcome"
              />
              <AuthField
                label="Logged-Out Indicator"
                tooltip='Regex pattern indicating the session has expired (e.g. "Login")'
                value={auth.loggedOutIndicator}
                onChange={(v) => update("loggedOutIndicator", v)}
                placeholder="Login|Sign In"
              />
            </div>
          </section>

          <section className="space-y-6 p-8 rounded-3xl bg-black/20 border border-white/5 backdrop-blur-xl shadow-2xl">
            <div className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">
              Advanced Params
            </div>
            <AuthField
              label="Extra POST Data"
              tooltip='Additional form fields (e.g. "remember=true&type=admin")'
              value={auth.extraPostData}
              onChange={(v) => update("extraPostData", v)}
              placeholder="remember=true&type=admin (optional)"
            />
          </section>

          {AuthTestComponent}
        </div>
      </div>
    </div>
  );
}
