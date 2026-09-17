import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../store/useAuthStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, googleLogin } = useAuthStore();
  const googleBtnRef = useRef(null);
  const [googleClientId, setGoogleClientId] = useState(null);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  useEffect(() => {
    fetch('/api/auth/config')
      .then(res => res.json())
      .then(data => {
        if (data.googleClientId && data.googleClientId !== 'TU_CLIENT_ID_AQUI') {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(err => console.error('Error fetching auth config', err));
  }, []);

  useEffect(() => {
    if (!googleClientId) return;

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: googleBtnRef.current.offsetWidth,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center',
          });
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [googleClientId, mode]);

  const handleGoogleResponse = async (response) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(response.credential);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (form.name.trim().length < 2) throw new Error('El nombre debe tener al menos 2 caracteres');
        await register(form.email, form.name, form.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md bg-card border-border shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4 text-4xl">⚡</div>
          <CardTitle className="text-3xl font-bold tracking-tight">LoopDeck</CardTitle>
          <CardDescription className="text-muted-foreground mt-2 text-base">
            Spaced repetition, reimagined
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="flex bg-secondary p-1 rounded-xl mb-6">
            <Button
              type="button"
              variant={mode === 'login' ? 'default' : 'ghost'}
              className="flex-1 rounded-lg h-9"
              onClick={() => { setMode('login'); setError(''); }}
            >
              Iniciar sesión
            </Button>
            <Button
              type="button"
              variant={mode === 'register' ? 'default' : 'ghost'}
              className="flex-1 rounded-lg h-9"
              onClick={() => { setMode('register'); setError(''); }}
            >
              Crear cuenta
            </Button>
          </div>

          <div ref={googleBtnRef} className="w-full mb-6 flex justify-center"></div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o con email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="auth-name">Nombre</label>
                <Input
                  id="auth-name"
                  type="text"
                  name="name"
                  placeholder="Tu nombre"
                  value={form.name}
                  onChange={handleChange}
                  required
                  minLength={2}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="auth-email">Email</label>
              <Input
                id="auth-email"
                type="email"
                name="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="auth-password">Contraseña</label>
              <Input
                id="auth-password"
                type="password"
                name="password"
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                value={form.password}
                onChange={handleChange}
                required
                minLength={mode === 'register' ? 6 : 1}
              />
            </div>

            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20 flex items-start gap-2">
                <span className="mt-0.5">⚠️</span> 
                <p className="flex-1">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
              {loading ? 'Cargando...' : (mode === 'login' ? 'Entrar' : 'Crear cuenta')}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/50 pt-6">
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            >
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
