/**
 * RoleCard 组件
 * 角色卡牌，支持翻牌动画、正反面展示
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Role, Faction, ROLE_INFO } from '../types/werewolf';

interface RoleCardProps {
  /** 角色类型 */
  role: Role;
  /** 是否翻开（显示正面） */
  isRevealed?: boolean;
  /** 翻开延迟（毫秒） */
  revealDelay?: number;
  /** 卡片大小 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 是否显示技能描述 */
  showAbilities?: boolean;
  /** 是否只显示阵营（预言家查验用） */
  factionOnly?: boolean;
  /** 是否可交互 */
  interactive?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 翻牌完成回调 */
  onRevealComplete?: () => void;
}

// 角色对应的图标
const ROLE_ICONS: Record<Role, string> = {
  [Role.VILLAGER]: '👨‍🌾',
  [Role.WEREWOLF]: '🐺',
  [Role.SEER]: '🔮',
  [Role.WITCH]: '🧙‍♀️',
  [Role.HUNTER]: '🏹',
  [Role.GUARD]: '🛡️',
  [Role.IDIOT]: '🤡',
  [Role.ALPHA_WOLF]: '👹',
  [Role.CUPID]: '💘',
  [Role.LOVER]: '💕',
};

// 阵营对应的颜色配置
const FACTION_COLORS: Record<Faction, { bg: string; border: string; text: string; glow: string }> = {
  [Faction.VILLAGER]: {
    bg: 'bg-gradient-to-br from-emerald-900 to-green-800',
    border: 'border-emerald-500',
    text: 'text-emerald-300',
    glow: 'shadow-emerald-500/30',
  },
  [Faction.WEREWOLF]: {
    bg: 'bg-gradient-to-br from-red-900 to-rose-800',
    border: 'border-red-500',
    text: 'text-red-300',
    glow: 'shadow-red-500/30',
  },
  [Faction.NEUTRAL]: {
    bg: 'bg-gradient-to-br from-purple-900 to-violet-800',
    border: 'border-purple-500',
    text: 'text-purple-300',
    glow: 'shadow-purple-500/30',
  },
  [Faction.LOVERS]: {
    bg: 'bg-gradient-to-br from-pink-900 to-rose-800',
    border: 'border-pink-500',
    text: 'text-pink-300',
    glow: 'shadow-pink-500/30',
  },
};

// 阵营名称
const FACTION_NAMES: Record<Faction, string> = {
  [Faction.VILLAGER]: '好人阵营',
  [Faction.WEREWOLF]: '狼人阵营',
  [Faction.NEUTRAL]: '中立阵营',
  [Faction.LOVERS]: '情侣阵营',
};

// 卡片尺寸
const CARD_SIZES = {
  sm: { width: 'w-28', height: 'h-40', icon: 'text-3xl', title: 'text-sm', desc: 'text-xs' },
  md: { width: 'w-36', height: 'h-52', icon: 'text-4xl', title: 'text-base', desc: 'text-xs' },
  lg: { width: 'w-48', height: 'h-64', icon: 'text-5xl', title: 'text-lg', desc: 'text-sm' },
  xl: { width: 'w-64', height: 'h-80', icon: 'text-6xl', title: 'text-xl', desc: 'text-base' },
};

// 卡牌背面组件
function CardBack({ size }: { size: keyof typeof CARD_SIZES }) {
  const sizeConfig = CARD_SIZES[size];

  return (
    <div
      className={`
        ${sizeConfig.width} ${sizeConfig.height}
        bg-gradient-to-br from-gray-800 via-gray-900 to-black
        border-2 border-gray-600
        rounded-xl
        flex flex-col items-center justify-center
        shadow-lg
      `}
    >
      {/* 装饰边框 */}
      <div className="absolute inset-2 border border-gray-700 rounded-lg" />
      <div className="absolute inset-4 border border-gray-700/50 rounded-lg" />

      {/* 中心图案 */}
      <motion.div
        className="relative"
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <span className="text-5xl">🌙</span>
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <span className="text-6xl opacity-30">✨</span>
        </motion.div>
      </motion.div>

      {/* 底部文字 */}
      <div className="absolute bottom-4 text-center">
        <div className="text-gray-500 text-xs tracking-widest">狼 人 杀</div>
      </div>
    </div>
  );
}

// 卡牌正面组件
function CardFront({
  role,
  size,
  showAbilities,
  factionOnly,
}: {
  role: Role;
  size: keyof typeof CARD_SIZES;
  showAbilities: boolean;
  factionOnly: boolean;
}) {
  const sizeConfig = CARD_SIZES[size];
  const roleInfo = ROLE_INFO[role];
  const factionColors = FACTION_COLORS[roleInfo.faction];

  return (
    <div
      className={`
        ${sizeConfig.width} ${sizeConfig.height}
        ${factionColors.bg}
        border-2 ${factionColors.border}
        rounded-xl
        flex flex-col items-center
        shadow-lg ${factionColors.glow}
        overflow-hidden
        relative
      `}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, white 1px, transparent 1px),
                             radial-gradient(circle at 70% 80%, white 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      {/* 装饰边框 */}
      <div className={`absolute inset-2 border ${factionColors.border} opacity-30 rounded-lg`} />

      {/* 阵营标签 */}
      <div
        className={`
          mt-3 px-3 py-1 rounded-full
          ${factionColors.border} border
          text-xs font-medium ${factionColors.text}
          bg-black/30 backdrop-blur-sm
        `}
      >
        {FACTION_NAMES[roleInfo.faction]}
      </div>

      {/* 角色图标 */}
      <motion.div
        className={`mt-4 ${sizeConfig.icon}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 15,
          delay: 0.2,
        }}
      >
        {factionOnly ? (
          // 预言家查验只显示阵营图标
          roleInfo.faction === Faction.WEREWOLF ? '🐺' : '😇'
        ) : (
          ROLE_ICONS[role]
        )}
      </motion.div>

      {/* 角色名称 */}
      <motion.div
        className={`mt-3 font-bold text-white ${sizeConfig.title}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {factionOnly ? (
          roleInfo.faction === Faction.WEREWOLF ? '狼人' : '好人'
        ) : (
          roleInfo.name
        )}
      </motion.div>

      {/* 技能描述 */}
      {showAbilities && !factionOnly && (
        <motion.div
          className={`
            mt-auto mb-4 mx-3 p-2
            bg-black/30 backdrop-blur-sm rounded-lg
            text-center ${sizeConfig.desc}
          `}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-gray-300 mb-1">技能</div>
          <div className="text-white/80 leading-relaxed">
            {roleInfo.abilities.join(' / ')}
          </div>
        </motion.div>
      )}

      {/* 简短描述（不显示技能时） */}
      {!showAbilities && !factionOnly && (
        <motion.div
          className={`mt-2 px-3 text-center text-white/60 ${sizeConfig.desc}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {roleInfo.description.slice(0, 20)}...
        </motion.div>
      )}
    </div>
  );
}

export function RoleCard({
  role,
  isRevealed = false,
  revealDelay = 0,
  size = 'md',
  showAbilities = true,
  factionOnly = false,
  interactive = false,
  onClick,
  onRevealComplete,
}: RoleCardProps) {
  const [revealed, setRevealed] = useState(isRevealed);
  const [isFlipping, setIsFlipping] = useState(false);

  // 处理延迟翻牌
  useEffect(() => {
    if (isRevealed && !revealed) {
      const timer = setTimeout(() => {
        setIsFlipping(true);
        setRevealed(true);
      }, revealDelay);
      return () => clearTimeout(timer);
    } else if (!isRevealed && revealed) {
      setRevealed(false);
    }
  }, [isRevealed, revealDelay, revealed]);

  // 翻牌完成回调
  const handleFlipComplete = () => {
    setIsFlipping(false);
    if (revealed && onRevealComplete) {
      onRevealComplete();
    }
  };

  return (
    <motion.div
      className={`
        relative perspective-1000
        ${interactive ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
      whileHover={interactive ? { scale: 1.05 } : {}}
      whileTap={interactive ? { scale: 0.95 } : {}}
    >
      <motion.div
        className="relative preserve-3d"
        animate={{
          rotateY: revealed ? 180 : 0,
        }}
        transition={{
          duration: 0.6,
          ease: 'easeInOut',
        }}
        onAnimationComplete={handleFlipComplete}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* 卡牌背面 */}
        <div
          className="absolute backface-hidden"
          style={{
            backfaceVisibility: 'hidden',
          }}
        >
          <CardBack size={size} />
        </div>

        {/* 卡牌正面 */}
        <div
          className="backface-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <CardFront
            role={role}
            size={size}
            showAbilities={showAbilities}
            factionOnly={factionOnly}
          />
        </div>
      </motion.div>

      {/* 翻牌时的光效 */}
      <AnimatePresence>
        {isFlipping && (
          <motion.div
            className="absolute inset-0 bg-white rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 角色揭示弹窗组件
interface RoleRevealModalProps {
  role: Role;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export function RoleRevealModal({
  role,
  isOpen,
  onClose,
  title = '你的角色',
  subtitle,
}: RoleRevealModalProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const roleInfo = ROLE_INFO[role];

  // 打开时自动翻牌
  useEffect(() => {
    if (isOpen) {
      setIsRevealed(false);
      const timer = setTimeout(() => {
        setIsRevealed(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex flex-col items-center gap-6 p-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              {subtitle && (
                <p className="text-gray-400 mt-1">{subtitle}</p>
              )}
            </motion.div>

            {/* 卡牌 */}
            <RoleCard
              role={role}
              size="xl"
              isRevealed={isRevealed}
              revealDelay={0}
              showAbilities={true}
            />

            {/* 角色描述 */}
            <AnimatePresence>
              {isRevealed && (
                <motion.div
                  className="text-center max-w-md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-gray-300 leading-relaxed">
                    {roleInfo.description}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 关闭按钮 */}
            <motion.button
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg
                        font-medium text-white transition-colors"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              我知道了
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 预言家查验结果组件
interface SeerCheckResultProps {
  role: Role;
  playerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SeerCheckResult({
  role,
  playerName,
  isOpen,
  onClose,
}: SeerCheckResultProps) {
  const roleInfo = ROLE_INFO[role];
  const isWerewolf = roleInfo.faction === Faction.WEREWOLF;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex flex-col items-center gap-6 p-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-bold text-white">查验结果</h2>
              <p className="text-gray-400 mt-1">查验玩家: {playerName}</p>
            </motion.div>

            {/* 结果卡牌 */}
            <RoleCard
              role={role}
              size="lg"
              isRevealed={true}
              factionOnly={true}
              showAbilities={false}
            />

            {/* 结果文字 */}
            <motion.div
              className={`text-2xl font-bold ${isWerewolf ? 'text-red-400' : 'text-green-400'}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              {isWerewolf ? '狼人!' : '好人'}
            </motion.div>

            {/* 关闭按钮 */}
            <motion.button
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg
                        font-medium text-white transition-colors"
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              知道了
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RoleCard;
