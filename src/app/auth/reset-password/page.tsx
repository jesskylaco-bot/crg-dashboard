'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [validSession, setValidSession] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // The recovery link routes through /auth/callback, which exchanges the code
  // and establishes a session before sending the user here. Confirm we have it.
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      setValidSession(!!user)
      setChecking(false)
    }
    check()
  }, [supabase])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    )
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Link expired or invalid</CardTitle>
            <CardDescription>
              This password reset link is no longer valid. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4">
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full">Request a new link</Button>
            </Link>
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 text-center">
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-xl">Password updated</CardTitle>
            <CardDescription>Your password has been changed. You can now use it to sign in.</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" onClick={() => { router.push('/dashboard'); router.refresh() }}>
              Continue to dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <span className="text-3xl font-bold tracking-tight">
              CRG<span className="text-sage-600">.</span>
            </span>
          </div>
          <CardTitle className="text-xl">Set a new password</CardTitle>
          <CardDescription>Enter and confirm your new password below</CardDescription>
        </CardHeader>
        <form onSubmit={handleReset}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                New password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400">Must be at least 8 characters</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm new password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update password'}
            </Button>
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 text-center">
              Back to sign in
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
