export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white text-xl font-bold shadow-md">
            C
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Coaching App</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
