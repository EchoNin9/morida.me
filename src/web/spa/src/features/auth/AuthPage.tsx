import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../shell/AuthContext";

/* ------------------------------------------------------------------ */
/*  Promise wrappers for window.auth callbacks                        */
/* ------------------------------------------------------------------ */

type SignInChallenge = {
  challenge: string;
  session: string;
  challengeParameters?: Record<string, string>;
};
type SignInTokens = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
};
type SignInResult = SignInChallenge | SignInTokens;

function isChallenge(r: unknown): r is SignInChallenge {
  return typeof r === "object" && r !== null && "challenge" in r;
}

function promiseSignIn(email: string, password: string): Promise<SignInResult> {
  return new Promise((resolve, reject) => {
    if (!window.auth) return reject(new Error("Auth SDK not loaded"));
    window.auth.signIn(email, password, (err, result) => {
      if (err) reject(err);
      else resolve(result as SignInResult);
    });
  });
}

function promiseRespondToNewPassword(
  email: string,
  newPassword: string,
  session: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!window.auth) return reject(new Error("Auth SDK not loaded"));
    window.auth.respondToChallenge(
      "NEW_PASSWORD_REQUIRED",
      session,
      { USERNAME: email, NEW_PASSWORD: newPassword },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      },
    );
  });
}

function promiseSignUp(email: string, password: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!window.auth) return reject(new Error("Auth SDK not loaded"));
    window.auth.signUp(email, password, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function promiseConfirmSignUp(email: string, code: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!window.auth) return reject(new Error("Auth SDK not loaded"));
    window.auth.confirmSignUp(email, code, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function promiseForgotPassword(email: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!window.auth) return reject(new Error("Auth SDK not loaded"));
    window.auth.forgotPassword(email, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function promiseConfirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.auth) return reject(new Error("Auth SDK not loaded"));
    window.auth.confirmForgotPassword(email, code, newPassword, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

type Tab = "signin" | "signup";
type Step =
  | "form"
  | "confirm"
  | "newPassword"
  | "forgotRequest"
  | "forgotConfirm";

export function AuthPage() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const [tab, setTab] = useState<Tab>("signin");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [challengeSession, setChallengeSession] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    setStep("form");
    setError(null);
    setInfo(null);
  }

  function startForgot() {
    setStep("forgotRequest");
    setError(null);
    setInfo(null);
    setResetCode("");
    setResetPassword("");
    setConfirmResetPassword("");
  }

  async function handleRequestReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Enter the email address for your account");
      return;
    }
    setLoading(true);
    try {
      await promiseForgotPassword(email);
      setStep("forgotConfirm");
      setInfo(`We sent a verification code to ${email}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start password reset");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (resetPassword !== confirmResetPassword) {
      setError("Passwords do not match");
      return;
    }
    if (resetPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await promiseConfirmForgotPassword(email, resetCode.trim(), resetPassword);
      await promiseSignIn(email, resetPassword);
      await refreshAuth();
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await promiseSignIn(email, password);
      if (isChallenge(result)) {
        if (result.challenge === "NEW_PASSWORD_REQUIRED") {
          setChallengeSession(result.session);
          setStep("newPassword");
          return;
        }
        throw new Error(`Unsupported challenge: ${result.challenge}`);
      }
      await refreshAuth();
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetNewPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!challengeSession) {
      setError("Session expired — please sign in again");
      setStep("form");
      return;
    }
    setLoading(true);
    try {
      await promiseRespondToNewPassword(email, newPassword, challengeSession);
      await refreshAuth();
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set new password");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await promiseSignUp(email, password);
      setStep("confirm");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await promiseConfirmSignUp(email, code);
      /* After confirmation, sign in automatically */
      await promiseSignIn(email, password);
      await refreshAuth();
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-max section-padding flex justify-center">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ── Tab toggle ── */}
        <div className="flex rounded-lg bg-secondary-800 p-1 mb-8">
          {(["signin", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors ${
                tab === t
                  ? "bg-primary-500 text-white shadow"
                  : "text-secondary-400 hover:text-secondary-200"
              }`}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        {info && !error && (
          <div className="mb-6 p-3 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-300 text-sm">
            {info}
          </div>
        )}

        {/* ── New password (FORCE_CHANGE_PASSWORD challenge) ── */}
        {tab === "signin" && step === "newPassword" && (
          <form onSubmit={handleSetNewPassword} className="space-y-5">
            <h2 className="text-2xl font-display font-bold text-secondary-100">
              Set a new password
            </h2>
            <p className="text-sm text-secondary-400">
              Your account requires a new password before first sign in. Pick something
              you'll remember — we won't email it.
            </p>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                New password
              </label>
              <input
                type="password"
                required
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="input-field"
                placeholder="Re-enter new password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Setting password..." : "Set password & sign in"}
            </button>
          </form>
        )}

        {/* ── Sign In form ── */}
        {tab === "signin" && step === "form" && (
          <form onSubmit={handleSignIn} className="space-y-5">
            <h2 className="text-2xl font-display font-bold text-secondary-100">
              Welcome Back
            </h2>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={startForgot}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {/* ── Forgot password (request code) ── */}
        {tab === "signin" && step === "forgotRequest" && (
          <form onSubmit={handleRequestReset} className="space-y-5">
            <h2 className="text-2xl font-display font-bold text-secondary-100">
              Reset your password
            </h2>
            <p className="text-sm text-secondary-400">
              Enter your account email and we'll send you a verification code.
            </p>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending code..." : "Send reset code"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setError(null);
                  setInfo(null);
                }}
                className="text-sm text-secondary-400 hover:text-secondary-200"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}

        {/* ── Forgot password (confirm code + new password) ── */}
        {tab === "signin" && step === "forgotConfirm" && (
          <form onSubmit={handleConfirmReset} className="space-y-5">
            <h2 className="text-2xl font-display font-bold text-secondary-100">
              Enter reset code
            </h2>
            <p className="text-sm text-secondary-400">
              We sent a code to <strong className="text-secondary-200">{email}</strong>.
              Enter it below along with your new password.
            </p>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                Verification code
              </label>
              <input
                type="text"
                required
                autoFocus
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                className="input-field text-center tracking-widest text-lg"
                placeholder="000000"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                New password
              </label>
              <input
                type="password"
                required
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="input-field"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                required
                value={confirmResetPassword}
                onChange={(e) => setConfirmResetPassword(e.target.value)}
                className="input-field"
                placeholder="Re-enter new password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Resetting..." : "Reset password & sign in"}
            </button>
            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("forgotRequest");
                  setError(null);
                }}
                className="text-secondary-400 hover:text-secondary-200"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setError(null);
                  setInfo(null);
                }}
                className="text-secondary-400 hover:text-secondary-200"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}

        {/* ── Sign Up form ── */}
        {tab === "signup" && step === "form" && (
          <form onSubmit={handleSignUp} className="space-y-5">
            <h2 className="text-2xl font-display font-bold text-secondary-100">
              Create Account
            </h2>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="Re-enter password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>
        )}

        {/* ── Confirmation code ── */}
        {tab === "signup" && step === "confirm" && (
          <form onSubmit={handleConfirm} className="space-y-5">
            <h2 className="text-2xl font-display font-bold text-secondary-100">
              Confirm Your Email
            </h2>
            <p className="text-sm text-secondary-400">
              We sent a verification code to <strong className="text-secondary-200">{email}</strong>.
              Enter it below to activate your account.
            </p>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input-field text-center tracking-widest text-lg"
                placeholder="000000"
                maxLength={6}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>
          </form>
        )}
      </motion.div>
    </main>
  );
}
