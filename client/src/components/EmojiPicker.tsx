/**
 * EmojiPicker 组件
 * 游戏聊天表情包选择器，支持分类浏览、快速发送
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

// 表情分类
export interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: Emoji[];
}

// 单个表情
export interface Emoji {
  emoji: string;
  name: string;
  keywords?: string[];
}

// 游戏主题表情数据
const GAME_EMOJIS: EmojiCategory[] = [
  {
    id: 'werewolf',
    name: '狼人杀',
    icon: '🐺',
    emojis: [
      { emoji: '🐺', name: '狼人', keywords: ['wolf', 'werewolf', '狼'] },
      { emoji: '🌙', name: '夜晚', keywords: ['moon', 'night', '月亮'] },
      { emoji: '☀️', name: '白天', keywords: ['sun', 'day', '太阳'] },
      { emoji: '🔮', name: '预言家', keywords: ['seer', 'crystal', '水晶球'] },
      { emoji: '🧪', name: '女巫', keywords: ['witch', 'potion', '药水'] },
      { emoji: '🔫', name: '猎人', keywords: ['hunter', 'gun', '枪'] },
      { emoji: '🛡️', name: '守卫', keywords: ['guard', 'shield', '盾牌'] },
      { emoji: '🤡', name: '白痴', keywords: ['idiot', 'fool', '小丑'] },
      { emoji: '👑', name: '狼王', keywords: ['alpha', 'king', '王冠'] },
      { emoji: '💘', name: '丘比特', keywords: ['cupid', 'love', '爱情'] },
      { emoji: '👨‍🌾', name: '村民', keywords: ['villager', 'farmer', '农民'] },
      { emoji: '⚰️', name: '死亡', keywords: ['death', 'coffin', '棺材'] },
      { emoji: '🗳️', name: '投票', keywords: ['vote', 'ballot', '投票箱'] },
      { emoji: '🎭', name: '伪装', keywords: ['mask', 'disguise', '面具'] },
      { emoji: '🎯', name: '击杀', keywords: ['target', 'kill', '目标'] },
      { emoji: '⚔️', name: '对决', keywords: ['duel', 'fight', '剑'] },
    ],
  },
  {
    id: 'emotions',
    name: '表情',
    icon: '😀',
    emojis: [
      { emoji: '😀', name: '开心', keywords: ['happy', 'smile', '笑'] },
      { emoji: '😂', name: '笑哭', keywords: ['laugh', 'cry', '大笑'] },
      { emoji: '🤣', name: '爆笑', keywords: ['rofl', 'funny', '滚地笑'] },
      { emoji: '😊', name: '微笑', keywords: ['smile', 'blush', '羞涩'] },
      { emoji: '😏', name: '坏笑', keywords: ['smirk', 'evil', '得意'] },
      { emoji: '😎', name: '酷', keywords: ['cool', 'sunglasses', '墨镜'] },
      { emoji: '🤔', name: '思考', keywords: ['think', 'hmm', '想'] },
      { emoji: '😱', name: '惊恐', keywords: ['scared', 'shock', '害怕'] },
      { emoji: '😤', name: '生气', keywords: ['angry', 'mad', '愤怒'] },
      { emoji: '😭', name: '大哭', keywords: ['cry', 'sad', '伤心'] },
      { emoji: '🙄', name: '白眼', keywords: ['eyeroll', 'whatever', '无语'] },
      { emoji: '😴', name: '睡觉', keywords: ['sleep', 'tired', '困'] },
      { emoji: '🤫', name: '嘘', keywords: ['quiet', 'secret', '秘密'] },
      { emoji: '🤐', name: '闭嘴', keywords: ['shut', 'zip', '沉默'] },
      { emoji: '🤥', name: '说谎', keywords: ['lie', 'nose', '撒谎'] },
      { emoji: '😈', name: '恶魔', keywords: ['devil', 'evil', '坏人'] },
    ],
  },
  {
    id: 'actions',
    name: '动作',
    icon: '👋',
    emojis: [
      { emoji: '👋', name: '挥手', keywords: ['wave', 'hello', '打招呼'] },
      { emoji: '👍', name: '点赞', keywords: ['thumbsup', 'good', '好'] },
      { emoji: '👎', name: '踩', keywords: ['thumbsdown', 'bad', '差'] },
      { emoji: '👏', name: '鼓掌', keywords: ['clap', 'applause', '拍手'] },
      { emoji: '🙏', name: '祈祷', keywords: ['pray', 'please', '求求'] },
      { emoji: '🤝', name: '握手', keywords: ['handshake', 'deal', '合作'] },
      { emoji: '✌️', name: '胜利', keywords: ['peace', 'victory', 'V'] },
      { emoji: '🤞', name: '祝福', keywords: ['cross', 'luck', '好运'] },
      { emoji: '🫵', name: '指人', keywords: ['point', 'you', '你'] },
      { emoji: '👀', name: '围观', keywords: ['eyes', 'watch', '看'] },
      { emoji: '💪', name: '加油', keywords: ['strong', 'muscle', '强'] },
      { emoji: '🙈', name: '不看', keywords: ['see', 'monkey', '捂眼'] },
      { emoji: '🙊', name: '不说', keywords: ['speak', 'monkey', '捂嘴'] },
      { emoji: '🙉', name: '不听', keywords: ['hear', 'monkey', '捂耳'] },
      { emoji: '💀', name: '骷髅', keywords: ['skull', 'dead', '死'] },
      { emoji: '👻', name: '幽灵', keywords: ['ghost', 'boo', '鬼'] },
    ],
  },
  {
    id: 'symbols',
    name: '符号',
    icon: '❤️',
    emojis: [
      { emoji: '❤️', name: '红心', keywords: ['heart', 'love', '爱'] },
      { emoji: '💔', name: '心碎', keywords: ['broken', 'sad', '伤心'] },
      { emoji: '🔥', name: '火', keywords: ['fire', 'hot', '热'] },
      { emoji: '⭐', name: '星星', keywords: ['star', 'shine', '闪'] },
      { emoji: '❓', name: '问号', keywords: ['question', 'what', '什么'] },
      { emoji: '❗', name: '感叹号', keywords: ['exclamation', 'important', '重要'] },
      { emoji: '✅', name: '对勾', keywords: ['check', 'yes', '完成'] },
      { emoji: '❌', name: '叉号', keywords: ['cross', 'no', '错'] },
      { emoji: '⚠️', name: '警告', keywords: ['warning', 'caution', '注意'] },
      { emoji: '🚫', name: '禁止', keywords: ['forbidden', 'stop', '不行'] },
      { emoji: '💯', name: '百分百', keywords: ['hundred', 'perfect', '满分'] },
      { emoji: '💤', name: '睡眠', keywords: ['sleep', 'zzz', '休息'] },
      { emoji: '💬', name: '对话', keywords: ['chat', 'talk', '说'] },
      { emoji: '💭', name: '想法', keywords: ['thought', 'think', '想'] },
      { emoji: '🎉', name: '庆祝', keywords: ['party', 'celebrate', '派对'] },
      { emoji: '🎊', name: '彩带', keywords: ['confetti', 'congrats', '恭喜'] },
    ],
  },
];

// 快捷表情（常用）
const QUICK_EMOJIS = ['😀', '😂', '🤔', '😏', '👍', '👎', '🐺', '🔮', '🔫', '❤️', '🔥', '💯'];

// 本地存储键
const RECENT_EMOJIS_KEY = 'werewolf_recent_emojis';
const MAX_RECENT = 16;

// 获取最近使用的表情
function getRecentEmojis(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// 保存最近使用的表情
function saveRecentEmoji(emoji: string) {
  try {
    const recent = getRecentEmojis().filter((e) => e !== emoji);
    recent.unshift(emoji);
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

export function EmojiPicker({ onSelect, onClose, position = 'top' }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('werewolf');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 加载最近使用的表情
  useEffect(() => {
    setRecentEmojis(getRecentEmojis());
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // 处理选择表情
  const handleSelect = (emoji: string) => {
    saveRecentEmoji(emoji);
    setRecentEmojis(getRecentEmojis());
    onSelect(emoji);
  };

  // 搜索过滤
  const getFilteredEmojis = (): Emoji[] => {
    if (!searchQuery.trim()) {
      // 返回当前分类的表情
      if (activeCategory === 'recent') {
        return recentEmojis.map((e) => ({ emoji: e, name: e }));
      }
      const category = GAME_EMOJIS.find((c) => c.id === activeCategory);
      return category?.emojis || [];
    }

    // 搜索所有表情
    const query = searchQuery.toLowerCase();
    const results: Emoji[] = [];
    for (const category of GAME_EMOJIS) {
      for (const emoji of category.emojis) {
        if (
          emoji.name.toLowerCase().includes(query) ||
          emoji.keywords?.some((k) => k.toLowerCase().includes(query))
        ) {
          results.push(emoji);
        }
      }
    }
    return results;
  };

  const filteredEmojis = getFilteredEmojis();

  return (
    <motion.div
      ref={containerRef}
      className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 right-0 z-50`}
      initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
        {/* 搜索框 */}
        <div className="p-2 border-b border-gray-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索表情..."
            className="w-full px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded-md
                     focus:outline-none focus:border-blue-500 text-white placeholder-gray-400"
            autoFocus
          />
        </div>

        {/* 快捷表情 */}
        {!searchQuery && (
          <div className="px-2 py-1.5 border-b border-gray-700 flex flex-wrap gap-0.5">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="p-1.5 text-xl hover:bg-gray-700 rounded transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* 分类标签 */}
        {!searchQuery && (
          <div className="flex border-b border-gray-700 px-1">
            {/* 最近使用 */}
            {recentEmojis.length > 0 && (
              <button
                onClick={() => setActiveCategory('recent')}
                className={`p-2 text-lg transition-colors ${
                  activeCategory === 'recent'
                    ? 'bg-gray-700 border-b-2 border-blue-500'
                    : 'hover:bg-gray-700/50'
                }`}
                title="最近使用"
              >
                🕐
              </button>
            )}
            {GAME_EMOJIS.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`p-2 text-lg transition-colors ${
                  activeCategory === category.id
                    ? 'bg-gray-700 border-b-2 border-blue-500'
                    : 'hover:bg-gray-700/50'
                }`}
                title={category.name}
              >
                {category.icon}
              </button>
            ))}
          </div>
        )}

        {/* 表情网格 */}
        <div className="p-2 h-48 overflow-y-auto">
          {filteredEmojis.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {searchQuery ? '未找到匹配的表情' : '暂无表情'}
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-0.5">
              {filteredEmojis.map((emoji, index) => (
                <motion.button
                  key={`${emoji.emoji}-${index}`}
                  onClick={() => handleSelect(emoji.emoji)}
                  className="p-1.5 text-xl hover:bg-gray-700 rounded transition-colors"
                  title={emoji.name}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {emoji.emoji}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-3 py-1.5 border-t border-gray-700 text-xs text-gray-500 text-center">
          点击表情即可发送
        </div>
      </div>
    </motion.div>
  );
}

// 表情按钮组件（用于触发打开选择器）
interface EmojiButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function EmojiButton({ onClick, disabled }: EmojiButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 text-xl hover:bg-gray-700 rounded-lg transition-colors
                 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title="表情"
    >
      😊
    </button>
  );
}

// 导出表情数据（供其他组件使用）
export { GAME_EMOJIS, QUICK_EMOJIS };

export default EmojiPicker;
