/**
 * QuickPhrases 组件
 * 游戏内快捷短语选择器，让玩家快速发送常用的狼人杀游戏短语
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Role } from '../types/werewolf';

// 短语分类
interface PhraseCategory {
  id: string;
  nameKey: string;  // 翻译键
  icon: string;
  phrases: Phrase[];
}

// 单个短语
interface Phrase {
  id: string;
  textKey: string;  // 翻译键
  // 音效键（可选，将来可以添加语音播放）
  soundKey?: string;
  // 仅限特定角色显示
  roleRestricted?: Role[];
}

// 游戏短语数据 - 使用翻译键
const GAME_PHRASES: PhraseCategory[] = [
  {
    id: 'basic',
    nameKey: 'quickPhrases.categories.basic',
    icon: '💬',
    phrases: [
      { id: 'pass', textKey: 'quickPhrases.basic.pass', soundKey: 'pass' },
      { id: 'good_pass', textKey: 'quickPhrases.basic.good_pass', soundKey: 'good_pass' },
      { id: 'agree', textKey: 'quickPhrases.basic.agree', soundKey: 'agree' },
      { id: 'disagree', textKey: 'quickPhrases.basic.disagree', soundKey: 'disagree' },
      { id: 'trust', textKey: 'quickPhrases.basic.trust', soundKey: 'trust' },
      { id: 'doubt', textKey: 'quickPhrases.basic.doubt', soundKey: 'doubt' },
      { id: 'thinking', textKey: 'quickPhrases.basic.thinking', soundKey: 'thinking' },
      { id: 'confused', textKey: 'quickPhrases.basic.confused', soundKey: 'confused' },
    ],
  },
  {
    id: 'identity',
    nameKey: 'quickPhrases.categories.identity',
    icon: '🎭',
    phrases: [
      { id: 'im_villager', textKey: 'quickPhrases.identity.im_villager', soundKey: 'im_villager' },
      { id: 'im_seer', textKey: 'quickPhrases.identity.im_seer', soundKey: 'im_seer', roleRestricted: [Role.SEER] },
      { id: 'im_witch', textKey: 'quickPhrases.identity.im_witch', soundKey: 'im_witch', roleRestricted: [Role.WITCH] },
      { id: 'im_guard', textKey: 'quickPhrases.identity.im_guard', soundKey: 'im_guard', roleRestricted: [Role.GUARD] },
      { id: 'im_hunter', textKey: 'quickPhrases.identity.im_hunter', soundKey: 'im_hunter', roleRestricted: [Role.HUNTER] },
      { id: 'im_idiot', textKey: 'quickPhrases.identity.im_idiot', soundKey: 'im_idiot', roleRestricted: [Role.IDIOT] },
      { id: 'im_good', textKey: 'quickPhrases.identity.im_good', soundKey: 'im_good' },
      { id: 'checked_good', textKey: 'quickPhrases.identity.checked_good', soundKey: 'checked_good' },
      { id: 'checked_wolf', textKey: 'quickPhrases.identity.checked_wolf', soundKey: 'checked_wolf' },
    ],
  },
  {
    id: 'action',
    nameKey: 'quickPhrases.categories.action',
    icon: '⚔️',
    phrases: [
      { id: 'vote_him', textKey: 'quickPhrases.action.vote_him', soundKey: 'vote_him' },
      { id: 'follow_vote', textKey: 'quickPhrases.action.follow_vote', soundKey: 'follow_vote' },
      { id: 'abstain', textKey: 'quickPhrases.action.abstain', soundKey: 'abstain' },
      { id: 'check_him', textKey: 'quickPhrases.action.check_him', soundKey: 'check_him' },
      { id: 'protect_him', textKey: 'quickPhrases.action.protect_him', soundKey: 'protect_him' },
      { id: 'save_him', textKey: 'quickPhrases.action.save_him', soundKey: 'save_him' },
      { id: 'poison_him', textKey: 'quickPhrases.action.poison_him', soundKey: 'poison_him' },
      { id: 'self_vote', textKey: 'quickPhrases.action.self_vote', soundKey: 'self_vote' },
    ],
  },
  {
    id: 'analysis',
    nameKey: 'quickPhrases.categories.analysis',
    icon: '🔍',
    phrases: [
      { id: 'he_is_wolf', textKey: 'quickPhrases.analysis.he_is_wolf', soundKey: 'he_is_wolf' },
      { id: 'he_is_good', textKey: 'quickPhrases.analysis.he_is_good', soundKey: 'he_is_good' },
      { id: 'fake_seer', textKey: 'quickPhrases.analysis.fake_seer', soundKey: 'fake_seer' },
      { id: 'wolf_pit', textKey: 'quickPhrases.analysis.wolf_pit', soundKey: 'wolf_pit' },
      { id: 'god_pit', textKey: 'quickPhrases.analysis.god_pit', soundKey: 'god_pit' },
      { id: 'civil_pit', textKey: 'quickPhrases.analysis.civil_pit', soundKey: 'civil_pit' },
      { id: 'diving', textKey: 'quickPhrases.analysis.diving', soundKey: 'diving' },
      { id: 'logical', textKey: 'quickPhrases.analysis.logical', soundKey: 'logical' },
    ],
  },
  {
    id: 'wolf',
    nameKey: 'quickPhrases.categories.wolf',
    icon: '🐺',
    phrases: [
      { id: 'kill_him', textKey: 'quickPhrases.wolf.kill_him', soundKey: 'kill_him', roleRestricted: [Role.WEREWOLF, Role.ALPHA_WOLF] },
      { id: 'self_knife', textKey: 'quickPhrases.wolf.self_knife', soundKey: 'self_knife', roleRestricted: [Role.WEREWOLF, Role.ALPHA_WOLF] },
      { id: 'wait', textKey: 'quickPhrases.wolf.wait', soundKey: 'wait', roleRestricted: [Role.WEREWOLF, Role.ALPHA_WOLF] },
      { id: 'target_seer', textKey: 'quickPhrases.wolf.target_seer', soundKey: 'target_seer', roleRestricted: [Role.WEREWOLF, Role.ALPHA_WOLF] },
      { id: 'target_witch', textKey: 'quickPhrases.wolf.target_witch', soundKey: 'target_witch', roleRestricted: [Role.WEREWOLF, Role.ALPHA_WOLF] },
      { id: 'target_guard', textKey: 'quickPhrases.wolf.target_guard', soundKey: 'target_guard', roleRestricted: [Role.WEREWOLF, Role.ALPHA_WOLF] },
      { id: 'i_jump', textKey: 'quickPhrases.wolf.i_jump', soundKey: 'i_jump', roleRestricted: [Role.WEREWOLF, Role.ALPHA_WOLF] },
      { id: 'you_jump', textKey: 'quickPhrases.wolf.you_jump', soundKey: 'you_jump', roleRestricted: [Role.WEREWOLF, Role.ALPHA_WOLF] },
    ],
  },
  {
    id: 'emotion',
    nameKey: 'quickPhrases.categories.emotion',
    icon: '😊',
    phrases: [
      { id: 'haha', textKey: 'quickPhrases.emotion.haha', soundKey: 'haha' },
      { id: 'gg', textKey: 'quickPhrases.emotion.gg', soundKey: 'gg' },
      { id: 'nice', textKey: 'quickPhrases.emotion.nice', soundKey: 'nice' },
      { id: 'wp', textKey: 'quickPhrases.emotion.wp', soundKey: 'wp' },
      { id: 'sorry', textKey: 'quickPhrases.emotion.sorry', soundKey: 'sorry' },
      { id: 'hurry', textKey: 'quickPhrases.emotion.hurry', soundKey: 'hurry' },
      { id: 'relax', textKey: 'quickPhrases.emotion.relax', soundKey: 'relax' },
      { id: 'nervous', textKey: 'quickPhrases.emotion.nervous', soundKey: 'nervous' },
    ],
  },
];

// 快捷短语条（最常用的）- 使用翻译键
const QUICK_PHRASES: Phrase[] = [
  { id: 'quick_pass', textKey: 'quickPhrases.basic.pass' },
  { id: 'quick_agree', textKey: 'quickPhrases.basic.agree' },
  { id: 'quick_disagree', textKey: 'quickPhrases.basic.disagree' },
  { id: 'quick_vote', textKey: 'quickPhrases.action.vote_him' },
  { id: 'quick_follow', textKey: 'quickPhrases.action.follow_vote' },
  { id: 'quick_abstain', textKey: 'quickPhrases.action.abstain' },
];

interface QuickPhrasesProps {
  onSelect: (phrase: string) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
  myRole?: Role;
}

export function QuickPhrases({
  onSelect,
  onClose,
  position = 'top',
  myRole,
}: QuickPhrasesProps) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('basic');

  // 过滤掉角色限制的短语
  const getVisiblePhrases = (phrases: Phrase[]): Phrase[] => {
    return phrases.filter((phrase) => {
      if (!phrase.roleRestricted) return true;
      if (!myRole) return false;
      return phrase.roleRestricted.includes(myRole);
    });
  };

  // 获取当前分类的短语
  const currentCategory = GAME_PHRASES.find((c) => c.id === activeCategory);
  const currentPhrases = currentCategory ? getVisiblePhrases(currentCategory.phrases) : [];

  // 检查分类是否有可见的短语
  const hasPhrases = (category: PhraseCategory): boolean => {
    return getVisiblePhrases(category.phrases).length > 0;
  };

  return (
    <motion.div
      className={`absolute left-0 right-0 z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
      initial={{ opacity: 0, y: position === 'top' ? 10 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: position === 'top' ? 10 : -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden">
        {/* 分类标签 */}
        <div className="flex border-b border-gray-700 bg-gray-800/80 overflow-x-auto">
          {GAME_PHRASES.filter(hasPhrases).map((category) => (
            <button
              key={category.id}
              className={`flex items-center gap-1 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                activeCategory === category.id
                  ? 'bg-gray-700/50 text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              <span>{category.icon}</span>
              <span className="hidden sm:inline">{t(category.nameKey)}</span>
            </button>
          ))}
        </div>

        {/* 短语网格 */}
        <div className="p-3 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {currentPhrases.map((phrase) => (
              <motion.button
                key={phrase.id}
                className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600
                         text-gray-200 rounded-lg transition-colors text-center
                         border border-gray-600 hover:border-gray-500"
                onClick={() => {
                  onSelect(t(phrase.textKey));
                  onClose();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t(phrase.textKey)}
              </motion.button>
            ))}
          </div>
        </div>

        {/* 关闭按钮 */}
        <div className="flex justify-end p-2 border-t border-gray-700 bg-gray-800/50">
          <button
            className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1"
            onClick={onClose}
          >
            {t('quickPhrases.close')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// 快捷短语条组件
interface QuickPhraseBarProps {
  onSelect: (phrase: string) => void;
  disabled?: boolean;
}

export function QuickPhraseBar({ onSelect, disabled }: QuickPhraseBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {QUICK_PHRASES.map((phrase) => (
        <motion.button
          key={phrase.id}
          className={`
            flex-shrink-0 px-2 py-1 text-xs rounded-full
            ${disabled
              ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
            }
            border border-gray-600 transition-colors
          `}
          onClick={() => !disabled && onSelect(t(phrase.textKey))}
          whileHover={disabled ? {} : { scale: 1.05 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          disabled={disabled}
        >
          {t(phrase.textKey)}
        </motion.button>
      ))}
    </div>
  );
}

// 快捷短语按钮组件
interface QuickPhraseButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

export function QuickPhraseButton({ onClick, disabled, isActive }: QuickPhraseButtonProps) {
  return (
    <motion.button
      className={`
        p-2 rounded-lg transition-colors
        ${disabled
          ? 'text-gray-500 cursor-not-allowed'
          : isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
        }
      `}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.1 }}
      whileTap={disabled ? {} : { scale: 0.9 }}
      title="快捷短语"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="9" y1="10" x2="15" y2="10" />
      </svg>
    </motion.button>
  );
}

// 狼人专用快捷短语
const WOLF_QUICK_PHRASES: Phrase[] = [
  { id: 'wolf_kill', text: '刀他' },
  { id: 'wolf_wait', text: '等一下' },
  { id: 'wolf_self', text: '自刀' },
  { id: 'wolf_seer', text: '刀预言家' },
  { id: 'wolf_jump', text: '我来跳' },
];

// 狼人快捷短语条
interface WolfPhraseBarProps {
  onSelect: (phrase: string) => void;
  disabled?: boolean;
}

export function WolfPhraseBar({ onSelect, disabled }: WolfPhraseBarProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {WOLF_QUICK_PHRASES.map((phrase) => (
        <motion.button
          key={phrase.id}
          className={`
            flex-shrink-0 px-2 py-1 text-xs rounded-full
            ${disabled
              ? 'bg-red-900/30 text-red-400/50 cursor-not-allowed'
              : 'bg-red-900/50 hover:bg-red-800/50 text-red-300 hover:text-red-200'
            }
            border border-red-700/50 transition-colors
          `}
          onClick={() => !disabled && onSelect(phrase.text)}
          whileHover={disabled ? {} : { scale: 1.05 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          disabled={disabled}
        >
          🐺 {phrase.text}
        </motion.button>
      ))}
    </div>
  );
}

export default QuickPhrases;
