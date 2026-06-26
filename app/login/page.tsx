import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const initialError =
    searchParams.error === "inactive"
      ? "Your account has been deactivated. Contact management."
      : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-futex-gradient px-4 py-12">
      <Link href="/" className="mb-6">
        <Logo className="[&_span:last-child]:text-white [&_.text-futex-blue]:text-white [&_.text-futex-green]:text-white" />
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Sign in to your dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">
            Management · Field Officers · Installers · Accounting
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm initialError={initialError} />
        </CardContent>
      </Card>
      <p className="mt-6 text-sm text-white/80">
        <Link href="/" className="underline">
          ← Back to futexenergy.ph
        </Link>
      </p>
    </div>
  );
}
