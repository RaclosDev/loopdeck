import useStore from '../store/useStore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { applyThemeColor } from '../utils/colorHelper';
import { SegmentedControl } from '../components/ui/segmented-control';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const PRESETS = ['#0085FF', '#E11D48', '#FFFFFF', '#FF5E00', '#8B5CF6', '#10B981'];

export default function Settings() {
  const { user, logout } = useAuth();
  const { settings, updateSettings } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('study');
  const [customColor, setCustomColor] = useState(localStorage.getItem('loopdeck_custom_color') || '#0085FF');
  const [showClearModal, setShowClearModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleColorChange = (color: string) => {
    setCustomColor(color);
    applyThemeColor(color);
  };

  const handleClearLocalData = () => {
    localStorage.clear();
    logout();
    window.location.href = '/';
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const tabs = [
    { value: 'study', label: 'Estudio' },
    { value: 'appearance', label: 'Apariencia' },
    { value: 'account', label: 'Cuenta' }
  ];

  return (
    <div className="fade-in pb-12">
      <SegmentedControl
        options={tabs}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-6 overflow-x-auto"
      />

      {activeTab === 'study' && (
        <div className="card">
          <h3 className="text-xl font-bold mb-6">Opciones de Estudio</h3>
          
          <div className="flex justify-between items-center bg-black/10 p-4 rounded-xl">
            <div>
              <div className="font-semibold text-foreground">Cronómetro de Sesión</div>
              <div className="text-sm text-muted-foreground mt-1">Mostrar el tiempo durante el estudio</div>
            </div>
            <input 
              type="checkbox" 
              className="w-6 h-6 accent-[var(--accent-primary)]"
              checked={settings.showTimer} 
              onChange={(e) => updateSettings({ showTimer: e.target.checked })} 
            />
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="card">
          <h3 className="text-xl font-bold mb-6">Apariencia</h3>

          <div className="mb-8">
            <label className="form-label mb-3 block uppercase tracking-wide text-xs">Color Principal</label>
            <div className="flex items-center gap-4 mb-3">
              <input 
                type="color" 
                value={customColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-12 h-12 p-0 border-0 rounded-xl cursor-pointer bg-transparent"
              />
              <div className="flex gap-3 flex-wrap items-center">
                {PRESETS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    className="w-10 h-10 rounded-full cursor-pointer p-0 transition-transform hover:scale-110"
                    style={{
                      background: color, 
                      border: customColor === color ? '2px solid white' : '2px solid transparent',
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              El color se aplicará instantáneamente a toda la interfaz.
            </p>
          </div>
          
          <div className="flex justify-between items-center border-t border-white/10 pt-6">
            <div>
              <div className="font-semibold text-foreground">Animaciones 3D</div>
              <div className="text-sm text-muted-foreground mt-1">Efecto de giro al voltear tarjetas</div>
            </div>
            <input 
              type="checkbox" 
              className="w-6 h-6 accent-[var(--accent-primary)]"
              checked={settings.animationsEnabled ?? true} 
              onChange={(e) => updateSettings({ animationsEnabled: e.target.checked })} 
            />
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="card">
          <h3 className="text-xl font-bold mb-6">Tu Cuenta</h3>
          
          {user && (
            <div className="flex items-center gap-4 p-5 bg-black/20 rounded-xl mb-6 border border-white/5">
              <div className="w-14 h-14 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-2xl font-black text-white">
                {user.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div className="font-bold text-lg text-foreground">{user.name}</div>
                <div className="text-sm text-muted-foreground mt-1">{user.email}</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button variant="secondary" onClick={() => setShowClearModal(true)} className="w-full">
              Limpiar Caché Local
            </Button>
            <Button variant="destructive" onClick={() => setShowLogoutModal(true)} className="w-full">
              Cerrar sesión
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpiar Caché</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm my-2">¿Seguro que quieres limpiar los datos locales? Tendrás que volver a iniciar sesión.</p>
          <DialogFooter className="mt-4 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowClearModal(false)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleClearLocalData}>Limpiar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Sesión</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm my-2">¿Estás seguro de que quieres cerrar tu sesión actual?</p>
          <DialogFooter className="mt-4 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowLogoutModal(false)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleLogout}>Cerrar Sesión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}