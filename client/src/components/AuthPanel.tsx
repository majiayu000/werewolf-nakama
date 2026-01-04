/**
 * AuthPanel - 登录/注册面板组件
 * 支持邮箱登录、邮箱注册、游客快速开始
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

// 表单模式
type AuthMode = 'login' | 'register' | 'guest';

interface AuthPanelProps {
  onLogin: (email: string, password: string, remember: boolean) => Promise<{ success: boolean; error?: string }>;
  onRegister: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  onGuestLogin: (username?: string) => Promise<void>;
  isConnecting: boolean;
  error: string | null;
  className?: string;
}

// 输入框组件
function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoComplete={autoComplete}
        className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-lg
          text-white placeholder-gray-500
          focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors"
      />
    </div>
  );
}

// 按钮组件
function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  fullWidth,
  loading,
  type = 'button',
  loadingText,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  loadingText?: string;
}) {
  const baseClasses = `
    relative px-4 py-2.5 rounded-lg font-medium
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-purple-600 to-indigo-600
      hover:from-purple-500 hover:to-indigo-500
      text-white shadow-lg shadow-purple-500/30
      active:scale-[0.98]
    `,
    secondary: `
      bg-gray-700 hover:bg-gray-600
      text-white border border-gray-600
      active:scale-[0.98]
    `,
    ghost: `
      bg-transparent hover:bg-gray-800/50
      text-gray-300 hover:text-white
    `,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <motion.span
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <span>{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// 登录表单
function LoginForm({
  onSubmit,
  onSwitchToRegister,
  onGuestLogin,
  isLoading,
  error,
}: {
  onSubmit: (email: string, password: string, remember: boolean) => void;
  onSwitchToRegister: () => void;
  onGuestLogin: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password, remember);
  };

  return (
    <motion.form
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
      onSubmit={handleSubmit}
    >
      <InputField
        id="login-email"
        label={t('auth.email')}
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="your@email.com"
        disabled={isLoading}
        autoComplete="email"
      />

      <InputField
        id="login-password"
        label={t('auth.password')}
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="******"
        disabled={isLoading}
        autoComplete="current-password"
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700
              text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
          />
          <span className="text-sm text-gray-400">{t('auth.rememberMe')}</span>
        </label>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      <Button type="submit" fullWidth loading={isLoading} disabled={!email || !password} loadingText={t('auth.processing')}>
        {t('auth.login')}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-900/80 text-gray-500">{t('common.or')}</span>
        </div>
      </div>

      <Button variant="secondary" fullWidth onClick={onGuestLogin} disabled={isLoading}>
        {t('auth.guestStart')}
      </Button>

      <p className="text-center text-sm text-gray-400">
        {t('auth.noAccount')}{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          {t('auth.registerNow')}
        </button>
      </p>
    </motion.form>
  );
}

// 注册表单
function RegisterForm({
  onSubmit,
  onSwitchToLogin,
  isLoading,
  error,
}: {
  onSubmit: (email: string, password: string, username: string) => void;
  onSwitchToLogin: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError(t('auth.errors.passwordMismatch'));
      return;
    }

    onSubmit(email, password, username);
  };

  const displayError = localError || error;

  return (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
      onSubmit={handleSubmit}
    >
      <InputField
        id="register-username"
        label={t('auth.username')}
        value={username}
        onChange={setUsername}
        placeholder={t('auth.usernameChars')}
        maxLength={12}
        disabled={isLoading}
        autoComplete="username"
      />

      <InputField
        id="register-email"
        label={t('auth.email')}
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="your@email.com"
        disabled={isLoading}
        autoComplete="email"
      />

      <InputField
        id="register-password"
        label={t('auth.password')}
        type="password"
        value={password}
        onChange={setPassword}
        placeholder={t('auth.passwordChars')}
        disabled={isLoading}
        autoComplete="new-password"
      />

      <InputField
        id="register-confirm-password"
        label={t('auth.confirmPassword')}
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder={t('auth.reenterPassword')}
        disabled={isLoading}
        autoComplete="new-password"
      />

      {displayError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-sm"
        >
          {displayError}
        </motion.div>
      )}

      <Button
        type="submit"
        fullWidth
        loading={isLoading}
        disabled={!email || !password || !confirmPassword || !username}
        loadingText={t('auth.processing')}
      >
        {t('auth.register')}
      </Button>

      <p className="text-center text-sm text-gray-400">
        {t('auth.hasAccount')}{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          {t('auth.loginNow')}
        </button>
      </p>
    </motion.form>
  );
}

// 游客登录表单（简化版）
function GuestForm({
  onSubmit,
  onSwitchToLogin,
  isLoading,
}: {
  onSubmit: (username: string) => void;
  onSwitchToLogin: () => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(username);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
      onSubmit={handleSubmit}
    >
      <InputField
        id="guest-username"
        label={t('auth.guestNickname')}
        value={username}
        onChange={setUsername}
        placeholder={t('auth.leaveEmptyRandom')}
        maxLength={12}
        disabled={isLoading}
      />

      <Button type="submit" fullWidth loading={isLoading} loadingText={t('auth.processing')}>
        {t('auth.startGame')}
      </Button>

      <p className="text-center text-sm text-gray-400">
        {t('auth.saveStats')}{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          {t('auth.createAccount')}
        </button>
      </p>
    </motion.form>
  );
}

// 主组件
export function AuthPanel({
  onLogin,
  onRegister,
  onGuestLogin,
  isConnecting,
  error,
  className = '',
}: AuthPanelProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [formError, setFormError] = useState<string | null>(null);

  const handleLogin = useCallback(async (email: string, password: string, remember: boolean) => {
    setFormError(null);
    const result = await onLogin(email, password, remember);
    if (!result.success && result.error) {
      setFormError(result.error);
    }
  }, [onLogin]);

  const handleRegister = useCallback(async (email: string, password: string, username: string) => {
    setFormError(null);
    const result = await onRegister(email, password, username);
    if (!result.success && result.error) {
      setFormError(result.error);
    }
  }, [onRegister]);

  const handleGuestLogin = useCallback(async (username?: string) => {
    setFormError(null);
    await onGuestLogin(username);
  }, [onGuestLogin]);

  const switchMode = (newMode: AuthMode) => {
    setFormError(null);
    setMode(newMode);
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* 标签切换 */}
      <div className="flex mb-6 bg-gray-800/50 rounded-lg p-1">
        <button
          onClick={() => switchMode('login')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'login'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {t('auth.tab.login')}
        </button>
        <button
          onClick={() => switchMode('register')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'register'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {t('auth.tab.register')}
        </button>
        <button
          onClick={() => switchMode('guest')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'guest'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {t('auth.tab.guest')}
        </button>
      </div>

      {/* 表单内容 */}
      <AnimatePresence mode="wait">
        {mode === 'login' && (
          <LoginForm
            key="login"
            onSubmit={handleLogin}
            onSwitchToRegister={() => switchMode('register')}
            onGuestLogin={() => handleGuestLogin()}
            isLoading={isConnecting}
            error={formError || error}
          />
        )}
        {mode === 'register' && (
          <RegisterForm
            key="register"
            onSubmit={handleRegister}
            onSwitchToLogin={() => switchMode('login')}
            isLoading={isConnecting}
            error={formError || error}
          />
        )}
        {mode === 'guest' && (
          <GuestForm
            key="guest"
            onSubmit={handleGuestLogin}
            onSwitchToLogin={() => switchMode('login')}
            isLoading={isConnecting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// 绑定邮箱弹窗（用于游客账户升级）
export function LinkEmailModal({
  isOpen,
  onClose,
  onLinkEmail,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLinkEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('auth.errors.passwordMismatch'));
      return;
    }

    const result = await onLinkEmail(email, password);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }, 1500);
    } else if (result.error) {
      setError(result.error);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md mx-4 p-6 bg-gray-900 border border-gray-700 rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-4">{t('auth.bindEmailTitle')}</h2>
        <p className="text-gray-400 text-sm mb-4">
          {t('auth.bindEmailDesc')}
        </p>

        {success ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg text-center"
          >
            <span className="text-green-400 text-lg">{t('auth.bindEmailSuccess')}</span>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              id="link-email"
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="your@email.com"
              disabled={isLoading}
            />

            <InputField
              id="link-password"
              label={t('auth.setPassword')}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={t('auth.passwordChars')}
              disabled={isLoading}
            />

            <InputField
              id="link-confirm-password"
              label={t('auth.confirmPassword')}
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder={t('auth.reenterPassword')}
              disabled={isLoading}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                fullWidth
                loading={isLoading}
                disabled={!email || !password || !confirmPassword}
                loadingText={t('auth.processing')}
              >
                {t('auth.linkEmail')}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// 用户信息显示组件（已登录状态）
export function UserInfo({
  username,
  email,
  authMethod,
  onLogout,
  onLinkEmail,
}: {
  username: string;
  email: string | null;
  authMethod: 'device' | 'email' | null;
  onLogout: () => void;
  onLinkEmail?: () => void;
}) {
  const { t } = useTranslation();
  const isGuest = authMethod === 'device';

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/50 rounded-lg">
      {/* 头像 */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
        {username.charAt(0).toUpperCase()}
      </div>

      {/* 用户信息 */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{username}</p>
        {isGuest ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-yellow-500">{t('auth.guestAccount')}</span>
            {onLinkEmail && (
              <button
                onClick={onLinkEmail}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                {t('auth.linkEmail')}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 truncate">{email}</p>
        )}
      </div>

      {/* 登出按钮 */}
      <button
        onClick={onLogout}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        title={t('auth.logout')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}

export default AuthPanel;
