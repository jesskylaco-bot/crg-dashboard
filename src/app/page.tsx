import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  // If Supabase is not configured, show setup page
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">CRG Platform</h1>
          <p className="text-gray-600 mb-6">Supabase is not configured yet.</p>
          <div className="text-left bg-gray-50 rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">To get started:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Create a Supabase project at supabase.com</li>
              <li>Run the schema from <code className="bg-gray-200 px-1 rounded">supabase/schema.sql</code></li>
              <li>Copy <code className="bg-gray-200 px-1 rounded">.env.local.example</code> to <code className="bg-gray-200 px-1 rounded">.env.local</code></li>
              <li>Add your Supabase URL and anon key</li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
