import * as z from "zod";

// Supabase hashes with bcrypt, which silently ignores bytes past 72.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Ange en giltig e-postadress." }).max(254, { error: "E-postadressen är för lång." }));

const newPassword = z
  .string()
  .min(PASSWORD_MIN, { error: `Lösenordet måste vara minst ${PASSWORD_MIN} tecken.` })
  .max(PASSWORD_MAX, { error: `Lösenordet får vara högst ${PASSWORD_MAX} tecken.` });

const passwordsMatch = { error: "Lösenorden matchar inte.", path: ["confirmPassword"] };

export const SignUpSchema = z
  .object({ email, password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, passwordsMatch);

export const LogInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Ange ditt lösenord." }).max(PASSWORD_MAX),
});

export const ForgotPasswordSchema = z.object({ email });

export const NewPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, passwordsMatch);

export const ChangePasswordSchema = z
  .object({ currentPassword: z.string().min(1, { error: "Ange ditt nuvarande lösenord." }), password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, passwordsMatch);

export const DeleteAccountSchema = z.object({
  currentPassword: z.string().min(1, { error: "Ange ditt lösenord." }),
  confirmText: z.literal("RADERA", { error: "Skriv RADERA för att bekräfta." }),
});

export type AuthFormState =
  | {
      error?: string;
      success?: string;
      fieldErrors?: Partial<Record<string, string[]>>;
      // Echoed back so the email field survives a failed submit.
      email?: string;
    }
  | undefined;
