import { Link, useNavigate } from 'react-router-dom';
import { login, signup } from '../lib/sync';

import { useState } from 'react';

type Props = { mode: 'login' | 'signup' };

/**
 * Shared email/password form for the /login and /signup pages. On success it
 * navigates to "/", where the app re-checks the session on mount and merges any
 * local (anonymous) invoices into the account - so no shared state is needed
 * across the route boundary.
 */
export default function AuthForm({ mode }: Props) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signup(email, password, name.trim() || undefined);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-slate-50 p-4'>
      <div className='w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
        <Link
          to='/'
          className='mb-6 inline-flex items-center gap-2 text-slate-800'
        >
          <span className='flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white'>
            W
          </span>
          <span className='font-semibold'>Wajib</span>
        </Link>

        <h1 className='text-xl font-semibold text-slate-800'>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className='mb-5 mt-1 text-sm text-slate-500'>
          Sync your invoices across devices. Your current invoices will be kept.
        </p>

        <form onSubmit={submit} className='space-y-3'>
          {mode === 'signup' && (
            <input
              type='text'
              placeholder='Name (optional)'
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete='name'
              className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
            />
          )}
          <input
            type='email'
            required
            placeholder='Email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete='email'
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
          />
          <input
            type='password'
            required
            placeholder={
              mode === 'signup' ? 'Password (min 10 characters)' : 'Password'
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === 'signup' ? 'new-password' : 'current-password'
            }
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
          />

          {error && (
            <p className='rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600'>
              {error}
            </p>
          )}

          <button
            type='submit'
            disabled={busy}
            className='w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60'
          >
            {busy
              ? 'Please wait…'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className='mt-5 text-center text-sm text-slate-500'>
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <Link
                to='/login'
                className='font-medium text-indigo-600 hover:text-indigo-500'
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              No account?{' '}
              <Link
                to='/signup'
                className='font-medium text-indigo-600 hover:text-indigo-500'
              >
                Create one
              </Link>
            </>
          )}
        </p>

        <p className='mt-3 text-center text-xs text-slate-400'>
          <Link to='/' className='hover:text-slate-600'>
            Continue without an account
          </Link>
        </p>
      </div>
    </div>
  );
}
