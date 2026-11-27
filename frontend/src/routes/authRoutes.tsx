import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import { AUTH_PATHS, loginPathFor, safeNext } from '../lib/authRedirect';

/** Sin sesión, una ruta privada manda a /login recordando adónde se quería ir. */
function RedirectToLogin() {
  const { pathname, search } = useLocation();
  return <Navigate to={loginPathFor(pathname + search)} replace />;
}

/** Con sesión, /login y /registro llevan a la app (al ?next= validado o al inicio). */
export function RedirectFromAuth() {
  const [params] = useSearchParams();
  return <Navigate to={safeNext(params.get('next'))} replace />;
}

/** Rutas públicas: portada, acceso, registro y recuperar la contraseña. Todo lo demás pide iniciar sesión. */
export function PublicRoutes({ googleEnabled }: { googleEnabled: boolean }) {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path={AUTH_PATHS.login} element={<LoginPage googleEnabled={googleEnabled} />} />
      <Route path={AUTH_PATHS.register} element={<RegisterPage googleEnabled={googleEnabled} />} />
      <Route path={AUTH_PATHS.forgot} element={<ForgotPasswordPage />} />
      <Route path={AUTH_PATHS.reset} element={<ResetPasswordPage />} />
      <Route path="*" element={<RedirectToLogin />} />
    </Routes>
  );
}
