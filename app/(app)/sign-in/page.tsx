import { SignInForm } from "@/components/ide/SignInForm";

export const metadata = {
  title: "Sign in | WIT IDE",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only same-origin paths, so the parameter cannot be used to bounce somebody
  // off the platform after they authenticate.
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/ide";

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <SignInForm redirectTo={redirectTo} />
    </div>
  );
}
