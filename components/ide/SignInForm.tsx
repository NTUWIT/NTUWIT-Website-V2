"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Mark, PrimaryButton, Spinner } from "./primitives";

/**
 * The platform's own sign-in, built on Clerk's headless hooks rather than its
 * hosted UI.
 *
 * Two reasons beyond appearance. The hosted UI is a separate bundle fetched
 * from a CDN at the moment somebody tries to sign in, which is the worst
 * possible time for venue wifi to be slow; and it collided with Monaco's AMD
 * loader for weeks. This form is part of the app bundle and cannot fail that
 * way.
 *
 * Sign-up is deliberately absent. Access is invite-only, granted from the Clerk
 * dashboard, so there is no path to create an account here.
 */

type Step = "identifier" | "code";

export function SignInForm({ redirectTo = "/ide" }: { redirectTo?: string }) {
  const { signIn, errors } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("identifier");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fieldError =
    errors?.fields?.identifier?.message ??
    errors?.fields?.password?.message ??
    errors?.fields?.code?.message ??
    null;

  /**
   * Clerk's message for an unknown account is deliberately vague to avoid
   * confirming which addresses exist. On an invite-only instance the honest
   * explanation is almost always the same one, so it is spelled out.
   */
  const explain = (message: string | undefined) => {
    const text = message ?? "That did not work. Try again.";
    if (/couldn't find|not found|identifier/i.test(text)) {
      return "No account for that email. Accounts are created by invitation, so ask an organiser to invite you.";
    }
    return text;
  };

  const finish = async () => {
    const { error } = await signIn.finalize({ navigate: () => router.push(redirectTo) });
    if (error) setFailure(explain(error.message));
  };

  const withPassword = () =>
    startTransition(async () => {
      setFailure(null);
      const { error } = await signIn.password({ emailAddress: email.trim(), password });
      if (error) {
        setFailure(explain(error.message));
        return;
      }
      if (signIn.status === "complete") await finish();
      else setFailure("This account needs another step to sign in. Ask an organiser for help.");
    });

  const sendCode = () =>
    startTransition(async () => {
      setFailure(null);
      // sendCode takes the address directly; no separate create step is needed.
      const { error } = await signIn.emailCode.sendCode({ emailAddress: email.trim() });
      if (error) {
        setFailure(explain(error.message));
        return;
      }
      setStep("code");
    });

  const verifyCode = () =>
    startTransition(async () => {
      setFailure(null);
      const { error } = await signIn.emailCode.verifyCode({ code: code.trim() });
      if (error) {
        setFailure(explain(error.message));
        return;
      }
      if (signIn.status === "complete") await finish();
      else setFailure("That code was accepted but the sign-in is not complete. Try again.");
    });

  const problem = failure ?? fieldError;

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="font-ide-display text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm leading-relaxed text-ide-ink-2">
        {step === "identifier"
          ? "Use the email address your invitation was sent to."
          : `Enter the code sent to ${email}.`}
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === "code") verifyCode();
          else if (password) withPassword();
          else sendCode();
        }}
      >
        {step === "identifier" ? (
          <>
            <label className="block">
              <span className="block text-sm font-medium">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@e.ntu.edu.sg"
                className="mt-2 w-full rounded-control bg-ide-panel-2 px-3 py-2.5 text-ide-ink outline-none placeholder:text-ide-ink-3"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium">Password</span>
              <span className="mt-1 block text-xs text-ide-ink-3">
                Leave this empty to receive a one-time code by email instead.
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-control bg-ide-panel-2 px-3 py-2.5 text-ide-ink outline-none"
              />
            </label>
          </>
        ) : (
          <label className="block">
            <span className="block text-sm font-medium">Six-digit code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
              className="tnum mt-2 w-full rounded-control bg-ide-panel-2 px-3 py-2.5 font-mono text-ide-ink outline-none placeholder:text-ide-ink-3"
            />
          </label>
        )}

        {problem && (
          <div role="alert" className="settle rounded-inset bg-ide-fail-quiet px-3 py-2.5">
            <Mark tone="fail">{problem}</Mark>
          </div>
        )}

        <PrimaryButton type="submit" disabled={pending || email.trim() === ""} className="w-full">
          {pending && <Spinner />}
          {pending
            ? "Checking…"
            : step === "code"
              ? "Sign in"
              : password
                ? "Sign in"
                : "Email me a code"}
        </PrimaryButton>

        {step === "code" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setStep("identifier");
              setCode("");
              setFailure(null);
            }}
            className="w-full rounded-control px-3 py-2 text-sm text-ide-ink-3 transition hover:bg-ide-panel-2 hover:text-ide-ink disabled:opacity-40"
          >
            Use a different email
          </button>
        )}
      </form>

      <p className="mt-6 text-xs leading-relaxed text-ide-ink-3">
        WIT IDE is open to invited members only. If you do not have an account,
        ask a committee member to send you an invitation.
      </p>
    </div>
  );
}
