import Link from 'next/link'

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Account Pending Approval
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your account has been created successfully, but it needs to be approved by an administrator before you can access the system.
          </p>
        </div>
        <div>
          <Link href="/auth/sign-in" className="font-medium text-indigo-600 hover:text-indigo-500">
            Return to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
