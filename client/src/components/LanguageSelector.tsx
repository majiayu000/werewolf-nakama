/**
 * LanguageSelector.tsx - 语言切换组件
 * 支持下拉菜单、按钮和紧凑模式
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { changeLanguage, getCurrentLanguage, type SupportedLanguage } from '../i18n';

// 语言选项数据
const LANGUAGE_OPTIONS: Array<{
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}> = [
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
];

interface LanguageSelectorProps {
  className?: string;
}

/**
 * 下拉式语言选择器
 */
export function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = getCurrentLanguage();
  const currentOption = LANGUAGE_OPTIONS.find(l => l.code === currentLang) || LANGUAGE_OPTIONS[0];

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80
                   border border-gray-600/50 rounded-lg transition-all duration-200
                   focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        aria-label={t('settings.language.title')}
      >
        <span className="text-lg">{currentOption.flag}</span>
        <span className="text-sm text-gray-200">{currentOption.nativeName}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400 text-xs"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-1 min-w-[140px] bg-gray-800 border border-gray-600/50
                       rounded-lg shadow-xl overflow-hidden z-50"
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                           ${lang.code === currentLang
                             ? 'bg-blue-600/30 text-blue-300'
                             : 'hover:bg-gray-700/80 text-gray-200'}`}
              >
                <span className="text-lg">{lang.flag}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{lang.nativeName}</span>
                  <span className="text-xs text-gray-400">{lang.name}</span>
                </div>
                {lang.code === currentLang && (
                  <span className="ml-auto text-blue-400">✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 紧凑版语言按钮（仅显示图标）
 */
export function LanguageButton({ className = '' }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const currentLang = getCurrentLanguage();
  const currentOption = LANGUAGE_OPTIONS.find(l => l.code === currentLang) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div ref={buttonRef} className={`relative ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center rounded-full
                   bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/50
                   transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Change language"
      >
        <span className="text-xl">{currentOption.flag}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 bg-gray-800 border border-gray-600/50
                       rounded-lg shadow-xl overflow-hidden z-50"
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <motion.button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                           ${lang.code === currentLang
                             ? 'bg-blue-600/30 text-blue-300'
                             : 'hover:bg-gray-700/80 text-gray-200'}`}
                whileHover={{ x: 2 }}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm">{lang.nativeName}</span>
                {lang.code === currentLang && (
                  <span className="ml-auto text-blue-400">✓</span>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 简单切换按钮（在两种语言间切换）
 */
export function LanguageToggle({ className = '' }: LanguageSelectorProps) {
  const currentLang = getCurrentLanguage();
  const nextLang = currentLang === 'zh' ? 'en' : 'zh';
  const nextOption = LANGUAGE_OPTIONS.find(l => l.code === nextLang)!;

  const handleToggle = () => {
    changeLanguage(nextLang);
  };

  return (
    <motion.button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800/60 hover:bg-gray-700/60
                 border border-gray-600/50 rounded-md text-sm transition-colors ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`Switch to ${nextOption.nativeName}`}
    >
      <span>{nextOption.flag}</span>
      <span className="text-gray-300">{nextOption.nativeName}</span>
    </motion.button>
  );
}

/**
 * 设置面板中的语言选择器
 */
interface LanguageSettingsPanelProps {
  className?: string;
}

export function LanguageSettingsPanel({ className = '' }: LanguageSettingsPanelProps) {
  const { t } = useTranslation();
  const currentLang = getCurrentLanguage();

  return (
    <div className={`p-4 bg-gray-800/50 rounded-lg border border-gray-700 ${className}`}>
      <h3 className="text-sm font-medium text-gray-300 mb-3">
        {t('settings.language.title')}
      </h3>
      <div className="space-y-2">
        {LANGUAGE_OPTIONS.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                       ${lang.code === currentLang
                         ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300'
                         : 'bg-gray-700/50 border border-transparent hover:bg-gray-600/50 text-gray-200'}`}
          >
            <span className="text-xl">{lang.flag}</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">{lang.nativeName}</div>
              <div className="text-xs text-gray-400">{lang.name}</div>
            </div>
            {lang.code === currentLang && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
              >
                <span className="text-white text-xs">✓</span>
              </motion.div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default LanguageSelector;
