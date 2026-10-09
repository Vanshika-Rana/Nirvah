import { LoginForm } from "@/components/login-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-[0_1px_0_rgba(28,25,23,0.04)] sm:p-6">
        <p className="text-sm font-medium text-accent">Nirvah</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mb-6 mt-2 text-sm text-muted">
          Private budget tracking for one person. Your records stay in your Supabase project.
        </p>
        <LoginForm configured={isSupabaseConfigured()} />
      </div>
    </div>
  );
}
