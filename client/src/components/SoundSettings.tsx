/**
 * SoundSettings 组件
 * 音效控制面板，支持开关、音量调节
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundEffects, SoundType } from '../hooks/useSoundEffects';


// 本地存储 key
const STORAGE_KEY = 'werewolf_sound_settings';

// 音效设置接口
interface SoundSettingsState {
  enabled: boolean;
  volume: number;
}

// 加载设置
function loadSettings(): SoundSettingsState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load sound settings:', e);
  }
  return { enabled: true, volume: 0.5 };
}

// 保存设置
function saveSettings(settings: SoundSettingsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save sound settings:', e);
  }
}

// 音量图标组件
function VolumeIcon({ volume, muted }: { volume: number; muted: boolean }) {
  if (muted || volume === 0) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
        />
      </svg>
    );
  }

  if (volume < 0.3) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
      </svg>
    );
  }

  if (volume < 0.7) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.54 8.46a5 5 0 010 7.07"
        />
      </svg>
    );
  }

  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
      />
    </svg>
  );
}

// 音量滑块组件
function VolumeSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      {/* 已填充部分 */}
      <motion.div
        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
        style={{ width: `${value * 100}%` }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.1 }}
      />
      {/* 滑块 */}
      <input
        type="range"
        min="0"
        max="100"
        value={value * 100}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        disabled={disabled}
        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      {/* 滑块手柄 */}
      <motion.div
        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg
          ${disabled ? 'bg-gray-500' : 'bg-white'}`}
        style={{ left: `calc(${value * 100}% - 8px)` }}
        animate={{ left: `calc(${value * 100}% - 8px)` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
}

// 紧凑模式按钮
export function SoundToggleButton({ onClick }: { onClick: () => void }) {
  const { isEnabled, volume, playSound } = useSoundEffects();

  const handleClick = () => {
    playSound(SoundType.BUTTON_CLICK);
    onClick();
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`p-2 rounded-lg transition-colors ${
        isEnabled
          ? 'bg-gray-700 hover:bg-gray-600 text-white'
          : 'bg-gray-800 hover:bg-gray-700 text-gray-500'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isEnabled ? '音效已开启' : '音效已关闭'}
    >
      <VolumeIcon volume={volume} muted={!isEnabled} />
    </motion.button>
  );
}

// 音效设置面板
export function SoundSettingsPanel({ onClose }: { onClose?: () => void }) {
  const { setEnabled, setVolume, playSound } = useSoundEffects();
  const [localSettings, setLocalSettings] = useState<SoundSettingsState>(() => loadSettings());

  // 同步设置
  useEffect(() => {
    setEnabled(localSettings.enabled);
    setVolume(localSettings.volume);
    saveSettings(localSettings);
  }, [localSettings, setEnabled, setVolume]);

  const handleToggle = useCallback(() => {
    const newEnabled = !localSettings.enabled;
    setLocalSettings(prev => ({ ...prev, enabled: newEnabled }));
    if (newEnabled) {
      // 开启时播放测试音效
      setTimeout(() => playSound(SoundType.BUTTON_CLICK), 100);
    }
  }, [localSettings.enabled, playSound]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setLocalSettings(prev => ({ ...prev, volume: newVolume }));
  }, []);

  const handleTestSound = useCallback(() => {
    playSound(SoundType.DAY_START);
  }, [playSound]);

  return (
    <motion.div
      className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <span>🔊</span>
          <span>音效设置</span>
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 开关 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-300">开启音效</span>
        <button
          onClick={handleToggle}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            localSettings.enabled ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <motion.div
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
            animate={{ left: localSettings.enabled ? '26px' : '2px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {/* 音量 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300">音量</span>
          <span className="text-gray-400 text-sm">{Math.round(localSettings.volume * 100)}%</span>
        </div>
        <div className="flex items-center gap-3">
          <VolumeIcon volume={localSettings.volume} muted={!localSettings.enabled} />
          <div className="flex-1">
            <VolumeSlider
              value={localSettings.volume}
              onChange={handleVolumeChange}
              disabled={!localSettings.enabled}
            />
          </div>
        </div>
      </div>

      {/* 测试按钮 */}
      <motion.button
        onClick={handleTestSound}
        disabled={!localSettings.enabled}
        className={`w-full py-2 rounded-lg font-medium transition-colors ${
          localSettings.enabled
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
        whileHover={localSettings.enabled ? { scale: 1.02 } : undefined}
        whileTap={localSettings.enabled ? { scale: 0.98 } : undefined}
      >
        🔔 测试音效
      </motion.button>

      {/* 提示 */}
      <p className="text-gray-500 text-xs mt-3 text-center">
        首次播放可能需要点击页面激活音频
      </p>
    </motion.div>
  );
}

// 浮动音效按钮（带弹出设置面板）
export function FloatingSoundControl() {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div className="relative">
      <SoundToggleButton onClick={() => setShowPanel(!showPanel)} />
      <AnimatePresence>
        {showPanel && (
          <motion.div
            className="absolute top-full right-0 mt-2 w-64 z-50"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <SoundSettingsPanel onClose={() => setShowPanel(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SoundSettingsPanel;
