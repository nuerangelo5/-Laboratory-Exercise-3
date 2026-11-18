import React, { useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import labPhoto from '../assets/images/college_ict_lab_desk_1794968286300.jpg';
import {
  EMAIL_CONFIRM_SQL,
  RECOMMENDED_CUSTODIAN_EMAIL,
  RECOMMENDED_CUSTODIAN_PASSWORD,
  SUPABASE_SCHEMA_SQL,
} from '../data/schemaSql';
import { supabase, SUPABASE_URL } from '../lib/supabase';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [needsEmailConfirmHint, setNeedsEmailConfirmHint] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedConfirmSql, setCopiedConfirmSql] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleUseRecommended = () => {
    setEmail(RECOMMENDED_CUSTODIAN_EMAIL);
    setPassword(RECOMMENDED_CUSTODIAN_PASSWORD);
    if (mode === 'signup' && !fullName) {
      setFullName('Laboratory Custodian');
    }
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Clipboard fallback handled silently
    }
  };

  const handleCopyConfirmSql = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL_CONFIRM_SQL);
      setCopiedConfirmSql(true);
      setTimeout(() => setCopiedConfirmSql(false), 2000);
    } catch {
      // Clipboard fallback handled silently
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setNeedsEmailConfirmHint(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your custodian email and password.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setNeedsEmailConfirmHint(true);
            setErrorMessage(
              'This custodian account has not been email-confirmed yet in Supabase.'
            );
          } else if (
            error.message.toLowerCase().includes('invalid login credentials')
          ) {
            setErrorMessage(
              'Invalid email or password. This account does not exist in Supabase Auth yet — add it in Supabase Dashboard → Authentication → Users → Add user (with Auto Confirm checked), or disable Confirm Email under Auth → Providers → Email before using Create Account.'
            );
          } else {
            setErrorMessage(error.message);
          }
          return;
        }
        onAuthSuccess();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim() || 'Equipment Custodian',
              role: 'custodian',
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('rate limit')) {
            setErrorMessage(
              'Supabase email confirmation rate limit reached. Open Supabase Dashboard → Authentication → Users → Add user (check "Auto Confirm User") or disable Confirm Email under Auth → Providers → Email.'
            );
          } else {
            setErrorMessage(error.message);
          }
          return;
        }

        if (data.session) {
          onAuthSuccess();
        } else {
          setNeedsEmailConfirmHint(true);
          setInfoMessage(
            'Custodian account created! Confirm your email via the link sent by Supabase (or run the quick confirmation SQL below) and then sign in.'
          );
          setMode('login');
        }
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to reach Supabase Auth.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] grid grid-cols-1 lg:grid-cols-12 items-stretch">
      {/* Left Institutional Photograph Column */}
      <div className="relative hidden lg:flex lg:col-span-5 bg-slate-900 overflow-hidden flex-col justify-between">
        {!imageError ? (
          <img
            src={labPhoto}
            alt="College ICT and audio-visual equipment laboratory desk"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/25" />

        <div className="relative z-10 p-10">
          <div className="flex items-center gap-2.5 text-white">
            <ShieldCheck className="w-5 h-5 text-blue-300 shrink-0" />
            <span className="font-display text-lg font-bold tracking-tight">
              CampusGear
            </span>
          </div>
        </div>

        <div className="relative z-10 p-10 space-y-4">
          <p className="text-xs font-medium tracking-wide text-blue-200">
            College Laboratory Inventory &amp; Custody Registry
          </p>
          <h1 className="font-display text-3xl font-bold text-white leading-tight max-w-md">
            Online Equipment Borrowing &amp; Return Monitoring System
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed max-w-md">
            Track laptops, projectors, cameras, audio kits, and laboratory
            devices in real time with automated availability updates, overdue
            detection, and complete borrowing histories.
          </p>
          <div className="pt-4 border-t border-white/15 flex items-center gap-4 text-xs text-slate-300">
            <span>Supabase Auth + RLS</span>
            <span aria-hidden="true">·</span>
            <span>PostgreSQL 1:M Schema</span>
            <span aria-hidden="true">·</span>
            <span>BSIT Section B</span>
          </div>
        </div>
      </div>

      {/* Right Authentication Form Column */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-slate-900">
            <ShieldCheck className="w-5 h-5 text-blue-700 lg:hidden shrink-0" />
            <span className="font-display text-base font-bold tracking-tight whitespace-nowrap">
              Equipment Custodian Portal
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            Supabase SQL Schema
          </button>
        </div>

        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              {mode === 'login'
                ? 'Sign in to manage equipment'
                : 'Create custodian account'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              {mode === 'login'
                ? 'Only authenticated laboratory custodians may record borrowing transactions and manage assets (BR-11).'
                : 'Register a custodian login directly in Supabase Authentication.'}
            </p>
          </div>

          {/* Mode Segmented Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className={`py-2 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Demo Credentials Helper Strip */}
          <div className="mb-6 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">
                Suggested Custodian Demo Account
              </p>
              <p className="text-xs font-mono text-slate-600 truncate mt-0.5">
                {RECOMMENDED_CUSTODIAN_EMAIL} / {RECOMMENDED_CUSTODIAN_PASSWORD}
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseRecommended}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Fill Form
            </button>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 space-y-2"
            >
              <p>{errorMessage}</p>
              {needsEmailConfirmHint && (
                <div className="pt-2 border-t border-red-200 space-y-1.5">
                  <p className="text-xs text-red-700">
                    Quick fix in Supabase SQL Editor (confirms pending accounts
                    for lab testing):
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono bg-white px-2.5 py-1.5 rounded border border-red-200 text-slate-800 overflow-x-auto">
                      {EMAIL_CONFIRM_SQL}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyConfirmSql}
                      className="px-2.5 py-1.5 text-xs font-medium bg-white border border-red-200 text-red-800 rounded hover:bg-red-100 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedConfirmSql ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {infoMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900 space-y-2">
              <p>{infoMessage}</p>
              {needsEmailConfirmHint && (
                <div className="pt-2 border-t border-blue-200 space-y-1.5">
                  <p className="text-xs text-blue-800">
                    Or confirm immediately via Supabase SQL Editor:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono bg-white px-2.5 py-1.5 rounded border border-blue-200 text-slate-800 overflow-x-auto">
                      {EMAIL_CONFIRM_SQL}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyConfirmSql}
                      className="px-2.5 py-1.5 text-xs font-medium bg-white border border-blue-200 text-blue-800 rounded hover:bg-blue-100 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedConfirmSql ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Custodian Full Name
                </label>
                <input
                  id="auth-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Maria Santos"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="campusgear.custodian@gmail.com"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  {submitting ? 'Signing in...' : 'Sign In to Dashboard'}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {submitting ? 'Creating account...' : 'Create Custodian Account'}
                </>
              )}
            </button>
          </form>
        </div>

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Connected to {new URL(SUPABASE_URL).hostname}</span>
          <span>Laboratory Exercise 3 · BSIT Section B</span>
        </div>
      </div>

      {/* Copyable Supabase SQL Modal */}
      {showSqlModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sql-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h3
                  id="sql-modal-title"
                  className="font-display text-base font-bold text-slate-900"
                >
                  Supabase PostgreSQL Schema (supabase/schema.sql)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste into your Supabase SQL Editor to create tables, RLS
                  policies, and college ICT sample data.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied SQL
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Full SQL
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  aria-label="Close SQL modal"
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto bg-slate-950 text-slate-100">
              <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
