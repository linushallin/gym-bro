"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert, SubmitButton, TextField } from "@/components/form-fields";
import {
  changePassword,
  deleteAccount,
  logIn,
  requestPasswordReset,
  setNewPassword,
  signUp,
} from "@/lib/auth-actions";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth-schemas";

const NEW_PASSWORD_HINT = `Minst ${PASSWORD_MIN} tecken. En lång fras är både säkrare och lättare att minnas.`;

export function LogInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(logIn, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <TextField
        label="E-post"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        autoFocus
        defaultValue={state?.email}
        errors={state?.fieldErrors?.email}
      />
      <div>
        <TextField
          label="Lösenord"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={PASSWORD_MAX}
          errors={state?.fieldErrors?.password}
        />
        <Link href="/glomt-losenord" className="mt-2 inline-block text-sm text-muted hover:text-foreground">
          Glömt lösenordet?
        </Link>
      </div>
      <SubmitButton>Logga in</SubmitButton>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUp, undefined);

  if (state?.success) return <FormAlert state={state} />;

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <TextField
        label="E-post"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        autoFocus
        defaultValue={state?.email}
        errors={state?.fieldErrors?.email}
      />
      <TextField
        label="Lösenord"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        hint={NEW_PASSWORD_HINT}
        errors={state?.fieldErrors?.password}
      />
      <TextField
        label="Upprepa lösenord"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        maxLength={PASSWORD_MAX}
        errors={state?.fieldErrors?.confirmPassword}
      />
      <SubmitButton>Skapa konto</SubmitButton>
      <p className="text-center text-xs text-subtle">
        Genom att skapa ett konto godkänner du hur vi hanterar dina uppgifter enligt vår{" "}
        <Link href="/integritet" className="underline hover:text-foreground">
          integritetspolicy
        </Link>
        .
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);

  if (state?.success) return <FormAlert state={state} />;

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <TextField
        label="E-post"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        autoFocus
        defaultValue={state?.email}
        errors={state?.fieldErrors?.email}
      />
      <SubmitButton>Skicka återställningslänk</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(setNewPassword, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <TextField
        label="Nytt lösenord"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        autoFocus
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        hint={NEW_PASSWORD_HINT}
        errors={state?.fieldErrors?.password}
      />
      <TextField
        label="Upprepa nytt lösenord"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        maxLength={PASSWORD_MAX}
        errors={state?.fieldErrors?.confirmPassword}
      />
      <SubmitButton>Spara lösenord</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <TextField
        label="Nuvarande lösenord"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        errors={state?.fieldErrors?.currentPassword}
      />
      <TextField
        label="Nytt lösenord"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        hint={NEW_PASSWORD_HINT}
        errors={state?.fieldErrors?.password}
      />
      <TextField
        label="Upprepa nytt lösenord"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        maxLength={PASSWORD_MAX}
        errors={state?.fieldErrors?.confirmPassword}
      />
      <SubmitButton>Byt lösenord</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <TextField
        label="Lösenord"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        errors={state?.fieldErrors?.currentPassword}
      />
      <TextField
        label="Skriv RADERA för att bekräfta"
        name="confirmText"
        autoComplete="off"
        autoCapitalize="characters"
        required
        errors={state?.fieldErrors?.confirmText}
      />
      <SubmitButton variant="danger">Radera mitt konto permanent</SubmitButton>
    </form>
  );
}
