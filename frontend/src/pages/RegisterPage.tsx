import AuthLayout from './landing/AuthLayout';

/** /registro: crear una cuenta nueva. */
export default function RegisterPage({ googleEnabled }: { googleEnabled: boolean }) {
  return <AuthLayout mode="register" googleEnabled={googleEnabled} />;
}
