import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    installPWA?: () => Promise<boolean>;
  }
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  isOffline: boolean;
}

interface UsePWAReturn extends PWAState {
  install: () => Promise<boolean>;
  update: () => void;
}

export function usePWA(): UsePWAReturn {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isUpdateAvailable: false,
    isOffline: !navigator.onLine,
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if app is installed (running in standalone mode)
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    setState((prev) => ({ ...prev, isInstalled: isStandalone }));

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setState((prev) => ({ ...prev, isInstalled: e.matches }));
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Handle install prompt
  useEffect(() => {
    const handleInstallAvailable = () => {
      setState((prev) => ({ ...prev, isInstallable: true }));
    };

    const handleInstalled = () => {
      setState((prev) => ({ ...prev, isInstallable: false, isInstalled: true }));
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Check for updates periodically
        const interval = setInterval(() => {
          reg.update().catch(() => {
            // Ignore update errors
          });
        }, 60 * 1000); // Check every minute

        return () => clearInterval(interval);
      });

      // Listen for new service worker waiting
      const handleControllerChange = () => {
        // Reload when new service worker takes control
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  // Listen for update available
  useEffect(() => {
    if (registration) {
      const handleUpdate = () => {
        if (registration.waiting) {
          setState((prev) => ({ ...prev, isUpdateAvailable: true }));
        }
      };

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              handleUpdate();
            }
          });
        }
      });
    }
  }, [registration]);

  const install = useCallback(async (): Promise<boolean> => {
    if (window.installPWA) {
      const result = await window.installPWA();
      if (result) {
        setState((prev) => ({ ...prev, isInstallable: false, isInstalled: true }));
      }
      return result;
    }
    return false;
  }, []);

  const update = useCallback(() => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting and become active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setState((prev) => ({ ...prev, isUpdateAvailable: false }));
    }
  }, [registration]);

  return {
    ...state,
    install,
    update,
  };
}

// PWA Install Button Component
export function PWAInstallPrompt({
  onInstall,
  onDismiss,
}: {
  onInstall?: () => void;
  onDismiss?: () => void;
}) {
  const { isInstallable, install } = usePWA();

  if (!isInstallable) return null;

  const handleInstall = async () => {
    const result = await install();
    if (result) {
      onInstall?.();
    } else {
      onDismiss?.();
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center">
          <span className="text-2xl">🐺</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm">安装狼人杀</h3>
          <p className="text-gray-400 text-xs mt-1">安装到桌面，获得更好的游戏体验</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          安装
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          稍后
        </button>
      </div>
    </div>
  );
}

// PWA Update Notification Component
export function PWAUpdateNotification({ onUpdate }: { onUpdate?: () => void }) {
  const { isUpdateAvailable, update } = usePWA();

  if (!isUpdateAvailable) return null;

  const handleUpdate = () => {
    update();
    onUpdate?.();
  };

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-blue-900 rounded-xl p-4 shadow-xl border border-blue-700 z-50">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-xl">🔄</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm">有新版本可用</h3>
          <p className="text-blue-200 text-xs mt-1">点击更新获取最新功能</p>
        </div>
        <button
          onClick={handleUpdate}
          className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          更新
        </button>
      </div>
    </div>
  );
}

// Offline Indicator Component
export function OfflineIndicator() {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-yellow-100 text-center text-sm py-2 z-50">
      <span className="mr-2">📡</span>
      您当前处于离线状态，部分功能可能不可用
    </div>
  );
}
