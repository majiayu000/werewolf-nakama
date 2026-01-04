import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types/werewolf';

// 音效类型枚举
export enum SoundType {
  // 阶段音效
  NIGHT_START = 'night_start',       // 夜晚开始（狼嚎）
  DAY_START = 'day_start',           // 白天开始（鸟鸣）
  VOTING_START = 'voting_start',     // 投票开始
  DISCUSSION_START = 'discussion_start', // 讨论开始

  // 技能音效
  WOLF_KILL = 'wolf_kill',           // 狼人击杀
  SEER_CHECK = 'seer_check',         // 预言家查验
  WITCH_SAVE = 'witch_save',         // 女巫救人
  WITCH_POISON = 'witch_poison',     // 女巫毒人
  GUARD_PROTECT = 'guard_protect',   // 守卫守护
  CUPID_LINK = 'cupid_link',         // 丘比特连线
  HUNTER_SHOOT = 'hunter_shoot',     // 猎人开枪

  // 事件音效
  PLAYER_DEATH = 'player_death',     // 玩家死亡
  VOTE_CAST = 'vote_cast',           // 投票
  ROLE_REVEAL = 'role_reveal',       // 角色揭示
  IDIOT_REVEAL = 'idiot_reveal',     // 白痴翻牌
  LOVER_LINK = 'lover_link',         // 情侣连线

  // 结果音效
  VICTORY = 'victory',               // 胜利
  DEFEAT = 'defeat',                 // 失败
  GAME_OVER = 'game_over',           // 游戏结束

  // 界面音效
  MESSAGE_RECEIVED = 'message_received', // 收到消息
  BUTTON_CLICK = 'button_click',     // 按钮点击
  TIMER_TICK = 'timer_tick',         // 计时器滴答
  TIMER_URGENT = 'timer_urgent',     // 时间紧迫
  PLAYER_JOIN = 'player_join',       // 玩家加入
  PLAYER_LEAVE = 'player_leave',     // 玩家离开
  READY = 'ready',                   // 准备
}

// 音效配置
interface SoundConfig {
  frequency?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  decay?: number;
  notes?: number[]; // 多音符序列
}

// 预设音效配置
const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  // 阶段音效
  [SoundType.NIGHT_START]: {
    notes: [220, 165, 110, 82.5], // 低沉的狼嚎（A3 -> E3 -> A2 -> E2）
    duration: 0.6,
    type: 'sawtooth',
    gain: 0.3,
  },
  [SoundType.DAY_START]: {
    notes: [523, 659, 784, 1047], // 欢快的鸟鸣（C5 -> E5 -> G5 -> C6）
    duration: 0.15,
    type: 'sine',
    gain: 0.25,
  },
  [SoundType.VOTING_START]: {
    notes: [440, 550, 660], // 投票提示（A4 -> C#5 -> E5）
    duration: 0.2,
    type: 'triangle',
    gain: 0.3,
  },
  [SoundType.DISCUSSION_START]: {
    notes: [392, 494, 587], // 讨论开始（G4 -> B4 -> D5）
    duration: 0.18,
    type: 'sine',
    gain: 0.25,
  },

  // 技能音效
  [SoundType.WOLF_KILL]: {
    notes: [110, 82.5, 55], // 低沉咆哮
    duration: 0.25,
    type: 'sawtooth',
    gain: 0.35,
  },
  [SoundType.SEER_CHECK]: {
    notes: [880, 1100, 1320, 1100, 880], // 神秘音效
    duration: 0.12,
    type: 'sine',
    gain: 0.2,
  },
  [SoundType.WITCH_SAVE]: {
    notes: [523, 659, 784, 1047], // 上升音效（治愈感）
    duration: 0.15,
    type: 'sine',
    gain: 0.25,
  },
  [SoundType.WITCH_POISON]: {
    notes: [440, 330, 220, 165], // 下降音效（毒药）
    duration: 0.2,
    type: 'triangle',
    gain: 0.3,
  },
  [SoundType.GUARD_PROTECT]: {
    notes: [330, 392, 494, 392, 330], // 盾牌音效
    duration: 0.1,
    type: 'square',
    gain: 0.15,
  },
  [SoundType.CUPID_LINK]: {
    notes: [523, 659, 784, 880, 1047], // 爱心音效
    duration: 0.12,
    type: 'sine',
    gain: 0.2,
  },
  [SoundType.HUNTER_SHOOT]: {
    frequency: 120,
    duration: 0.15,
    type: 'sawtooth',
    gain: 0.5,
    attack: 0.01,
    decay: 0.1,
  },

  // 事件音效
  [SoundType.PLAYER_DEATH]: {
    notes: [440, 392, 330, 262, 196], // 下降的悲伤音效
    duration: 0.25,
    type: 'sine',
    gain: 0.25,
  },
  [SoundType.VOTE_CAST]: {
    frequency: 600,
    duration: 0.08,
    type: 'square',
    gain: 0.15,
  },
  [SoundType.ROLE_REVEAL]: {
    notes: [262, 330, 392, 523], // 揭示音效
    duration: 0.15,
    type: 'triangle',
    gain: 0.25,
  },
  [SoundType.IDIOT_REVEAL]: {
    notes: [523, 587, 659, 698, 784], // 滑稽音效
    duration: 0.1,
    type: 'sine',
    gain: 0.25,
  },
  [SoundType.LOVER_LINK]: {
    notes: [523, 659, 784, 880, 1047, 1319], // 浪漫音效
    duration: 0.1,
    type: 'sine',
    gain: 0.2,
  },

  // 结果音效
  [SoundType.VICTORY]: {
    notes: [262, 330, 392, 523, 659, 784, 1047], // 胜利号角
    duration: 0.2,
    type: 'triangle',
    gain: 0.3,
  },
  [SoundType.DEFEAT]: {
    notes: [523, 392, 330, 262, 196, 165, 131], // 失败音效
    duration: 0.3,
    type: 'sine',
    gain: 0.25,
  },
  [SoundType.GAME_OVER]: {
    notes: [392, 330, 262],
    duration: 0.4,
    type: 'sine',
    gain: 0.3,
  },

  // 界面音效
  [SoundType.MESSAGE_RECEIVED]: {
    notes: [880, 1100],
    duration: 0.08,
    type: 'sine',
    gain: 0.15,
  },
  [SoundType.BUTTON_CLICK]: {
    frequency: 1200,
    duration: 0.05,
    type: 'sine',
    gain: 0.1,
  },
  [SoundType.TIMER_TICK]: {
    frequency: 800,
    duration: 0.03,
    type: 'sine',
    gain: 0.08,
  },
  [SoundType.TIMER_URGENT]: {
    notes: [880, 1100, 880],
    duration: 0.1,
    type: 'square',
    gain: 0.2,
  },
  [SoundType.PLAYER_JOIN]: {
    notes: [440, 550, 660],
    duration: 0.1,
    type: 'sine',
    gain: 0.15,
  },
  [SoundType.PLAYER_LEAVE]: {
    notes: [660, 550, 440],
    duration: 0.1,
    type: 'sine',
    gain: 0.15,
  },
  [SoundType.READY]: {
    notes: [523, 659, 784],
    duration: 0.12,
    type: 'sine',
    gain: 0.2,
  },
};

// 音效管理器类
class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private customSounds: Map<string, AudioBuffer> = new Map();

  constructor() {
    // 延迟初始化 AudioContext（需要用户交互后才能创建）
  }

  private initAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // Resume if suspended (due to browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }

  // 播放合成音效
  play(soundType: SoundType): void {
    if (!this.enabled) return;

    const config = SOUND_CONFIGS[soundType];
    if (!config) return;

    try {
      const ctx = this.initAudioContext();

      if (config.notes) {
        this.playNoteSequence(ctx, config.notes, config);
      } else if (config.frequency) {
        this.playSingleNote(ctx, config.frequency, config);
      }
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  private playSingleNote(
    ctx: AudioContext,
    frequency: number,
    config: SoundConfig
  ): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = config.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    const baseGain = (config.gain || 0.3) * this.volume;
    const attack = config.attack || 0.01;
    const decay = config.decay || config.duration * 0.8;

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(baseGain, ctx.currentTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + attack + decay);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + config.duration);
  }

  private playNoteSequence(
    ctx: AudioContext,
    notes: number[],
    config: SoundConfig
  ): void {
    const noteDuration = config.duration;
    const baseGain = (config.gain || 0.3) * this.volume;

    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = config.type || 'sine';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

      const startTime = ctx.currentTime + index * noteDuration;
      const attack = 0.01;
      const decay = noteDuration * 0.7;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(baseGain, startTime + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + noteDuration);
    });
  }

  // 加载自定义音频文件
  async loadSound(name: string, url: string): Promise<void> {
    try {
      const ctx = this.initAudioContext();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.customSounds.set(name, audioBuffer);
    } catch (error) {
      console.warn(`Failed to load sound ${name}:`, error);
    }
  }

  // 播放自定义音频
  playCustom(name: string): void {
    if (!this.enabled) return;

    const buffer = this.customSounds.get(name);
    if (!buffer) {
      console.warn(`Custom sound ${name} not loaded`);
      return;
    }

    try {
      const ctx = this.initAudioContext();
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      source.buffer = buffer;
      gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(0);
    } catch (error) {
      console.warn('Failed to play custom sound:', error);
    }
  }

  // 清理资源
  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.customSounds.clear();
  }
}

// 单例模式
let soundManagerInstance: SoundManager | null = null;

function getSoundManager(): SoundManager {
  if (!soundManagerInstance) {
    soundManagerInstance = new SoundManager();
  }
  return soundManagerInstance;
}

// React Hook
export interface UseSoundEffectsResult {
  // 播放音效
  playSound: (soundType: SoundType) => void;
  playCustomSound: (name: string) => void;

  // 控制
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  isEnabled: boolean;
  volume: number;

  // 加载自定义音效
  loadCustomSound: (name: string, url: string) => Promise<void>;

  // 便捷方法
  playPhaseSound: (phase: GamePhase) => void;
  playSkillSound: (skill: string) => void;
}

export function useSoundEffects(): UseSoundEffectsResult {
  const soundManager = useRef(getSoundManager());
  const previousPhaseRef = useRef<GamePhase | null>(null);
  const previousPlayersRef = useRef<string[]>([]);

  const { gameState, players, messages } = useGameStore();

  // 播放音效
  const playSound = useCallback((soundType: SoundType) => {
    soundManager.current.play(soundType);
  }, []);

  // 播放自定义音效
  const playCustomSound = useCallback((name: string) => {
    soundManager.current.playCustom(name);
  }, []);

  // 设置启用状态
  const setEnabled = useCallback((enabled: boolean) => {
    soundManager.current.setEnabled(enabled);
  }, []);

  // 设置音量
  const setVolume = useCallback((volume: number) => {
    soundManager.current.setVolume(volume);
  }, []);

  // 加载自定义音效
  const loadCustomSound = useCallback(async (name: string, url: string) => {
    await soundManager.current.loadSound(name, url);
  }, []);

  // 根据阶段播放音效
  const playPhaseSound = useCallback((phase: GamePhase) => {
    switch (phase) {
      case GamePhase.NIGHT:
      case GamePhase.NIGHT_WEREWOLF:
      case GamePhase.NIGHT_SEER:
      case GamePhase.NIGHT_WITCH:
      case GamePhase.NIGHT_GUARD:
      case GamePhase.NIGHT_CUPID:
        playSound(SoundType.NIGHT_START);
        break;
      case GamePhase.DAY_ANNOUNCE:
        playSound(SoundType.DAY_START);
        break;
      case GamePhase.DAY_DISCUSSION:
        playSound(SoundType.DISCUSSION_START);
        break;
      case GamePhase.DAY_VOTING:
        playSound(SoundType.VOTING_START);
        break;
      case GamePhase.GAME_OVER:
        playSound(SoundType.GAME_OVER);
        break;
    }
  }, [playSound]);

  // 根据技能播放音效
  const playSkillSound = useCallback((skill: string) => {
    switch (skill) {
      case 'werewolf':
      case 'alpha_wolf':
        playSound(SoundType.WOLF_KILL);
        break;
      case 'seer':
        playSound(SoundType.SEER_CHECK);
        break;
      case 'witch_save':
        playSound(SoundType.WITCH_SAVE);
        break;
      case 'witch_poison':
        playSound(SoundType.WITCH_POISON);
        break;
      case 'guard':
        playSound(SoundType.GUARD_PROTECT);
        break;
      case 'cupid':
        playSound(SoundType.CUPID_LINK);
        break;
      case 'hunter':
        playSound(SoundType.HUNTER_SHOOT);
        break;
    }
  }, [playSound]);

  // 自动响应游戏阶段变化
  useEffect(() => {
    const currentPhase = gameState.phase;
    if (previousPhaseRef.current !== currentPhase) {
      if (previousPhaseRef.current !== null) {
        playPhaseSound(currentPhase);
      }
      previousPhaseRef.current = currentPhase;
    }
  }, [gameState.phase, playPhaseSound]);

  // 自动响应玩家加入/离开
  useEffect(() => {
    const currentPlayerIds = players.map(p => p.id);
    const previousPlayerIds = previousPlayersRef.current;

    if (previousPlayerIds.length > 0) {
      // 检测新加入的玩家
      const newPlayers = currentPlayerIds.filter(id => !previousPlayerIds.includes(id));
      if (newPlayers.length > 0) {
        playSound(SoundType.PLAYER_JOIN);
      }

      // 检测离开的玩家
      const leftPlayers = previousPlayerIds.filter(id => !currentPlayerIds.includes(id));
      if (leftPlayers.length > 0) {
        playSound(SoundType.PLAYER_LEAVE);
      }
    }

    previousPlayersRef.current = currentPlayerIds;
  }, [players, playSound]);

  // 自动响应玩家死亡（通过存活人数变化检测）
  const previousAliveCountRef = useRef(0);
  useEffect(() => {
    const aliveCount = players.filter(p => p.isAlive).length;
    if (previousAliveCountRef.current > 0 && aliveCount < previousAliveCountRef.current) {
      playSound(SoundType.PLAYER_DEATH);
    }
    previousAliveCountRef.current = aliveCount;
  }, [players, playSound]);

  // 自动响应收到消息
  const previousMessageCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > previousMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      // 只对非系统消息播放音效
      if (lastMessage && lastMessage.type !== 'system') {
        playSound(SoundType.MESSAGE_RECEIVED);
      }
    }
    previousMessageCountRef.current = messages.length;
  }, [messages, playSound]);

  return {
    playSound,
    playCustomSound,
    setEnabled,
    setVolume,
    isEnabled: soundManager.current.isEnabled(),
    volume: soundManager.current.getVolume(),
    loadCustomSound,
    playPhaseSound,
    playSkillSound,
  };
}

// 导出 SoundManager 实例的便捷方法（用于非组件代码）
export function playGameSound(soundType: SoundType): void {
  getSoundManager().play(soundType);
}

export function setSoundEnabled(enabled: boolean): void {
  getSoundManager().setEnabled(enabled);
}

export function setSoundVolume(volume: number): void {
  getSoundManager().setVolume(volume);
}

export default useSoundEffects;
