import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function Settings() {
  const { user, logout } = useAuthStore();
  const { settings, updateSettings, addToast } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('study');

  const handleClearLocalData = () => {
    if (window.confirm('¿Seguro que quieres limpiar los datos guardados localmente? Tendrás que volver a iniciar sesión.')) {
      localStorage.clear();
      sessionStorage.clear();
      logout();
      navigate('/auth');
      addToast('Caché limpiada', 'success');
    }
  };

  const tabs = [
    { id: 'study', label: 'Estudio' },
    { id: 'appearance', label: 'Apariencia' },
    { id: 'account', label: 'Cuenta' }
  ];

  return (
    <div className="animate-in fade-in pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Configuración</h1>
        <p className="text-muted-foreground text-sm">Personaliza tu experiencia de estudio</p>
      </div>

      <div className="flex bg-secondary p-1 rounded-xl mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant="ghost"
            className={`flex-1 rounded-lg h-9 whitespace-nowrap px-4 ${activeTab === tab.id ? 'bg-background text-foreground shadow-sm hover:bg-background hover:text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'study' && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Opciones de Estudio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Cronómetro de Sesión</div>
                <div className="text-sm text-muted-foreground">Mostrar el tiempo durante el estudio</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.showTimer} onChange={(e) => updateSettings({ showTimer: e.target.checked })} />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'appearance' && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Apariencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Animaciones 3D</div>
                <div className="text-sm text-muted-foreground">Efecto de giro al voltear tarjetas</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.animationsEnabled ?? true} onChange={(e) => updateSettings({ animationsEnabled: e.target.checked })} />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'account' && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Tu Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {user && (
              <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg border border-border">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {user.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <div className="font-bold">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button variant="outline" onClick={handleClearLocalData}>
                Limpiar Caché Local
              </Button>
              <Button variant="destructive" onClick={() => {
                if(window.confirm('¿Quieres cerrar sesión?')) {
                  logout();
                  navigate('/auth');
                }
              }}>
                Cerrar sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
