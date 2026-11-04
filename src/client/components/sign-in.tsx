import { useState } from 'react';
import { auth } from 'void/client';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../shared/demo-accounts';
import { Avatar, Button, Card, Input, Separator } from './ui';

interface AuthResult {
  error?: { message?: string } | null;
}

async function throwOnAuthError(promise: Promise<unknown>): Promise<void> {
  const result = (await promise) as AuthResult | undefined;
  if (result && typeof result === 'object' && 'error' in result && result.error) {
    throw new Error(result.error.message || 'Authentication failed.');
  }
}

export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy('form');
    setError(null);
    try {
      if (mode === 'signup') {
        await throwOnAuthError(
          auth.signUp.email({ email: email.trim(), password, name: name.trim() || email.trim() }),
        );
      } else {
        await throwOnAuthError(auth.signIn.email({ email: email.trim(), password }));
      }
      onSignedIn();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  async function handleDemoSignIn(accountEmail: string, accountName: string) {
    setBusy(accountEmail);
    setError(null);
    try {
      try {
        await throwOnAuthError(auth.signIn.email({ email: accountEmail, password: DEMO_PASSWORD }));
      } catch {
        await throwOnAuthError(
          auth.signUp.email({ email: accountEmail, password: DEMO_PASSWORD, name: accountName }),
        );
      }
      onSignedIn();
    } catch (demoError) {
      setError(demoError instanceof Error ? demoError.message : 'Demo sign-in failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-stone-100 px-4 py-10 dark:bg-stone-950">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-700 text-lg font-bold text-white">
            f
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight">famuse</p>
            <p className="text-[13px] text-stone-500 dark:text-stone-400">
              Your private family hearth.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1 text-sm dark:bg-stone-800">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={
              mode === 'signin'
                ? 'rounded-md bg-white py-2.5 font-medium shadow-sm sm:py-1.5 dark:bg-stone-900'
                : 'rounded-md py-2.5 text-stone-500 hover:text-stone-900 sm:py-1.5 dark:text-stone-400 dark:hover:text-stone-100'
            }
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={
              mode === 'signup'
                ? 'rounded-md bg-white py-2.5 font-medium shadow-sm sm:py-1.5 dark:bg-stone-900'
                : 'rounded-md py-2.5 text-stone-500 hover:text-stone-900 sm:py-1.5 dark:text-stone-400 dark:hover:text-stone-100'
            }
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
          {mode === 'signup' && (
            <label className="grid gap-1.5 text-[13px] font-medium">
              Display name
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Grandma June"
                autoComplete="nickname"
                maxLength={100}
              />
            </label>
          )}
          <label className="grid gap-1.5 text-[13px] font-medium">
            Email
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium">
            Password
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>
          {error && (
            <p role="alert" className="text-[13px] text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy !== null} className="w-full">
            {busy === 'form' ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
          <Separator className="flex-1" />
          <span>or explore the demo household</span>
          <Separator className="flex-1" />
        </div>

        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={busy !== null}
              onClick={() => handleDemoSignIn(account.email, account.name)}
              className="flex min-h-12 items-center gap-3 rounded-lg border border-stone-200 px-3 py-2.5 text-left transition-colors hover:border-stone-400 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:hover:border-stone-500 dark:hover:bg-stone-800"
            >
              <Avatar name={account.name} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  Continue as {account.name}
                  <span className="ml-2 text-xs font-normal text-stone-500 dark:text-stone-400">
                    {account.status}
                  </span>
                </span>
                <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                  {busy === account.email ? 'Signing in…' : account.blurb}
                </span>
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-stone-500 dark:text-stone-400">
          Demo members join the seeded Miller household with one click.
        </p>
      </Card>
    </div>
  );
}
