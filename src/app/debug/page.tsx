export default function DebugPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto font-mono text-sm bg-white mt-10 rounded shadow border">
      <h1 className="text-xl font-bold mb-4 text-red-600">Environment Variable Diagnostics</h1>
      <p className="mb-4 text-gray-600">If any of these say "Missing", your AI Studio environment variables are not configured correctly.</p>

      <div className="space-y-2">
        <div className="flex justify-between border-b py-2">
          <span>NEXT_PUBLIC_FIREBASE_API_KEY</span>
          <span className={process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "text-green-600" : "text-red-600 font-bold"}>
            {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Present" : "Missing"}
          </span>
        </div>
        <div className="flex justify-between border-b py-2">
          <span>NEXT_PUBLIC_FIREBASE_PROJECT_ID</span>
          <span className={process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "text-green-600" : "text-red-600 font-bold"}>
            {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Present" : "Missing"}
          </span>
        </div>
        <div className="flex justify-between border-b py-2">
          <span>FIREBASE_PROJECT_ID (Admin SDK)</span>
          <span className={process.env.FIREBASE_PROJECT_ID ? "text-green-600" : "text-red-600 font-bold"}>
            {process.env.FIREBASE_PROJECT_ID ? "Present" : "Missing"}
          </span>
        </div>
        <div className="flex justify-between border-b py-2">
          <span>FIREBASE_CLIENT_EMAIL (Admin SDK)</span>
          <span className={process.env.FIREBASE_CLIENT_EMAIL ? "text-green-600" : "text-red-600 font-bold"}>
            {process.env.FIREBASE_CLIENT_EMAIL ? "Present" : "Missing"}
          </span>
        </div>
        <div className="flex justify-between border-b py-2">
          <span>FIREBASE_PRIVATE_KEY (Admin SDK)</span>
          <span className={process.env.FIREBASE_PRIVATE_KEY ? "text-green-600" : "text-red-600 font-bold"}>
            {process.env.FIREBASE_PRIVATE_KEY ? "Present" : "Missing"}
          </span>
        </div>
         <div className="flex justify-between border-b py-2">
          <span>GEMINI_API_KEY (Google AI Studio)</span>
          <span className={process.env.GEMINI_API_KEY ? "text-green-600" : "text-red-600 font-bold"}>
            {process.env.GEMINI_API_KEY ? "Present" : "Missing"}
          </span>
        </div>
      </div>
    </div>
  )
}
