import AuthLayout from './landing/AuthLayout';

/** /login: entrar con una cuenta existente. */
export default function LoginPage({ googleEnabled }: { googleEnabled: boolean }) {
  return <AuthLayout mode="login" googleEnabled={googleEnabled} />;
}
