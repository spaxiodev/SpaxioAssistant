'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Link } from '@/components/intl-link';
import { LayoutGrid } from 'lucide-react';

/**
 * Mobile-safe sign-in: same flow as SignInPage but no @react-three/fiber or three.js.
 * Used on narrow viewports to avoid ReactCurrentBatchConfig / duplicate React errors.
 */
export function SimpleSignIn({ className }: { className?: string }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setStep('code');
  };

  useEffect(() => {
    if (step === 'code') {
      const t = setTimeout(() => codeInputRefs.current[0]?.focus(), 500);
      return () => clearTimeout(t);
    }
  }, [step]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      if (value && index < 5) codeInputRefs.current[index + 1]?.focus();
      if (index === 5 && value && newCode.every((d) => d.length === 1)) {
        setTimeout(() => setStep('success'), 1500);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleBackClick = () => {
    setStep('email');
    setCode(['', '', '', '', '', '']);
  };

  return (
    <div
      className={`flex min-h-screen w-full flex-col bg-black relative ${className ?? ''}`}
    >
      {/* Static gradient background - no Canvas/Three.js */}
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08)_0%,_transparent_50%)]" />
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent z-0" />

      <div className="relative z-10 flex flex-col flex-1">
        <header className="fixed top-6 left-1/2 -translate-x-1/2 z-20 flex items-center justify-between w-[calc(100%-2rem)] max-w-lg pl-4 pr-4 py-3 rounded-full border border-[#333] bg-[#1f1f1f57] backdrop-blur-sm">
          <Link href="/" className="w-8 h-8 flex items-center justify-center text-gray-200 hover:text-white transition-colors">
            <LayoutGrid className="w-5 h-5" aria-hidden />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 text-xs border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-white/50 hover:text-white">
              Log in
            </Link>
            <Link href="/signup" className="px-3 py-1.5 text-xs font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200">
              Sign up
            </Link>
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center items-center pt-24 pb-12">
          <div className="w-full max-w-sm px-4 space-y-6 text-center">
            {step === 'email' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-[2.5rem] font-bold leading-tight tracking-tight text-white">
                    Welcome Developer
                  </h1>
                  <p className="text-lg sm:text-[1.8rem] text-white/70 font-light">
                    Your sign in component
                  </p>
                </div>
                <div className="space-y-4">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-full py-3 px-4"
                  >
                    <span className="text-lg">G</span>
                    <span>Sign in with Google</span>
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="h-px bg-white/10 flex-1" />
                    <span className="text-white/40 text-sm">or</span>
                    <div className="h-px bg-white/10 flex-1" />
                  </div>
                  <form onSubmit={handleEmailSubmit}>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="info@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-white border border-white/10 rounded-full py-3 px-4 focus:outline-none focus:border-white/30 text-center bg-white/5"
                        required
                      />
                      <button
                        type="submit"
                        className="absolute right-1.5 top-1.5 text-white w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                      >
                        →
                      </button>
                    </div>
                  </form>
                </div>
                <p className="text-xs text-white/40 pt-6">
                  By signing up, you agree to the{' '}
                  <Link href="/terms-and-conditions" className="underline text-white/40 hover:text-white/60">
                    MSA
                  </Link>
                  ,{' '}
                  <Link href="/privacy-policy" className="underline text-white/40 hover:text-white/60">
                    Privacy Notice
                  </Link>
                  , and related policies.
                </p>
              </div>
            )}

            {step === 'code' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-[2.5rem] font-bold leading-tight tracking-tight text-white">
                    We sent you a code
                  </h1>
                  <p className="text-lg text-white/50 font-light">Please enter it</p>
                </div>
                <div className="rounded-full py-4 px-5 border border-white/10 bg-transparent">
                  <div className="flex items-center justify-center gap-0">
                    {code.map((digit, i) => (
                      <div key={i} className="flex items-center">
                        <div className="relative">
                          <input
                            ref={(el) => { codeInputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleCodeChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            className="w-8 text-center text-xl bg-transparent text-white border-none focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{ caretColor: 'transparent' }}
                          />
                          {!digit && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-xl text-white">0</span>
                          )}
                        </div>
                        {i < 5 && <span className="text-white/20 text-xl">|</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-white/50 text-sm">Resend code</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleBackClick}
                    className="rounded-full bg-white text-black font-medium px-6 py-3 hover:bg-white/90"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-full font-medium py-3 border bg-[#111] text-white/50 border-white/10 cursor-not-allowed"
                    disabled
                  >
                    Continue
                  </button>
                </div>
                <p className="text-xs text-white/40 pt-4">
                  By signing up, you agree to the{' '}
                  <Link href="/terms-and-conditions" className="underline text-white/40 hover:text-white/60">MSA</Link>
                  ,{' '}
                  <Link href="/privacy-policy" className="underline text-white/40 hover:text-white/60">Privacy Notice</Link>, and related policies.
                </p>
              </div>
            )}

            {step === 'success' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-[2.5rem] font-bold leading-tight tracking-tight text-white">
                    You&apos;re in!
                  </h1>
                  <p className="text-lg text-white/50 font-light">Welcome</p>
                </div>
                <div className="py-8">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-white to-white/70 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <Link href="/dashboard" className="block w-full rounded-full bg-white text-black font-medium py-3 hover:bg-white/90 text-center">
                  Continue to Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
