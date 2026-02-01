import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Mail, Lock } from 'lucide-react';
import { authApi } from '@/lib/api/auth';

// Schematy walidacji
const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(8, 'Hasło musi mieć minimum 8 znaków'),
});

const passwordResetSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
});

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Hasło musi mieć minimum 8 znaków'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Hasła muszą być identyczne',
    path: ['confirmPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

type AuthFormData =
  | LoginFormData
  | RegisterFormData
  | PasswordResetFormData
  | UpdatePasswordFormData;

type FormType = 'login' | 'register' | 'password-reset' | 'update-password';

interface AuthFormProps {
  type: FormType;
}

export function AuthForm({ type }: AuthFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Wybór odpowiedniego schematu walidacji
  const getSchema = () => {
    switch (type) {
      case 'login':
        return loginSchema;
      case 'register':
        return registerSchema;
      case 'password-reset':
        return passwordResetSchema;
      case 'update-password':
        return updatePasswordSchema;
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(getSchema()),
  });

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      switch (type) {
        case 'login':
          if ('email' in data && 'password' in data) {
            await authApi.login(data.email, data.password);
            window.location.href = '/app/dashboard';
          }
          break;
        case 'register':
          if ('email' in data && 'password' in data) {
            const response = await authApi.register(data.email, data.password);
            setSuccess(response.message);
          }
          break;
        case 'password-reset':
          if ('email' in data) {
            const response = await authApi.resetPassword(data.email);
            setSuccess(response.message);
          }
          break;
        case 'update-password':
          if ('password' in data) {
            const response = await authApi.updatePassword(data.password);
            setSuccess(response.message);
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
          break;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Wystąpił błąd. Spróbuj ponownie.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'login':
        return 'Zaloguj się';
      case 'register':
        return 'Utwórz konto';
      case 'password-reset':
        return 'Resetuj hasło';
      case 'update-password':
        return 'Ustaw nowe hasło';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'login':
        return 'Wprowadź swoje dane, aby się zalogować';
      case 'register':
        return 'Wprowadź swoje dane, aby utworzyć konto';
      case 'password-reset':
        return 'Podaj adres email, na który wyślemy link do resetowania hasła';
      case 'update-password':
        return 'Wprowadź nowe hasło dla swojego konta';
    }
  };

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-100">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{getTitle()}</h1>
        <p className="text-sm text-muted-foreground">{getDescription()}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4">
            {/* Email field - dla wszystkich typów oprócz update-password */}
            {type !== 'update-password' && (
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nazwa@przykład.pl"
                    className={`pl-9 ${'email' in errors && errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    disabled={isLoading}
                    {...register('email')}
                  />
                </div>
                {'email' in errors && errors.email && (
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>
            )}

            {/* Password field - dla login, register i update-password */}
            {(type === 'login' ||
              type === 'register' ||
              type === 'update-password') && (
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {type === 'update-password' ? 'Nowe hasło' : 'Hasło'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className={`pl-9 ${'password' in errors && errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    disabled={isLoading}
                    {...register('password')}
                  />
                </div>
                {'password' in errors && errors.password && (
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    {errors.password.message}
                  </p>
                )}{' '}
                {(type === 'register' || type === 'update-password') &&
                  !('password' in errors && errors.password) && (
                    <p className="text-xs text-muted-foreground">
                      Hasło musi mieć minimum 8 znaków
                    </p>
                  )}{' '}
              </div>
            )}

            {/* Confirm Password field - tylko dla update-password */}
            {type === 'update-password' && (
              <div className="grid gap-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                >
                  Potwierdź hasło
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    className={`pl-9 ${'confirmPassword' in errors && errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    disabled={isLoading}
                    {...register('confirmPassword')}
                  />
                </div>
                {'confirmPassword' in errors && errors.confirmPassword && (
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            )}

            {/* Link do resetowania hasła - tylko dla login */}
            {type === 'login' && (
              <div className="flex items-center justify-end">
                <a
                  href="/password-reset"
                  className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4"
                >
                  Zapomniałeś hasła?
                </a>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isLoading && (
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {type === 'login' && 'Zaloguj się'}
              {type === 'register' && 'Utwórz konto'}
              {type === 'password-reset' && 'Wyślij link'}
              {type === 'update-password' && 'Zmień hasło'}
            </Button>
          </div>
        </form>

        {/* Link do przełączania między login/register */}
        {type === 'login' && (
          <p className="px-8 text-center text-sm text-muted-foreground">
            Nie masz konta?{' '}
            <a
              href="/register"
              className="underline underline-offset-4 hover:text-primary"
            >
              Zarejestruj się
            </a>
          </p>
        )}

        {type === 'register' && (
          <p className="px-8 text-center text-sm text-muted-foreground">
            Masz już konto?{' '}
            <a
              href="/login"
              className="underline underline-offset-4 hover:text-primary"
            >
              Zaloguj się
            </a>
          </p>
        )}

        {(type === 'password-reset' || type === 'update-password') && (
          <p className="px-8 text-center text-sm text-muted-foreground">
            <a
              href="/login"
              className="underline underline-offset-4 hover:text-primary"
            >
              Wróć do logowania
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
