export type SoundKey =
  | "ui_select"
  | "map_tap"
  | "wrong_comarca"
  | "almost_comarca"
  | "correct_comarca"
  | "objective_met"
  | "treasure_bonus"
  | "unlock"
  | "coin_reward"
  | "recharge"
  | "level_win"
  | "level_perfect"
  | "level_lose";

export type SoundGroup = "ui" | "feedback" | "reward" | "outcome";

export type SoundConfig = {
  src: string;
  baseVolume: number;
  cooldownMs: number;
  group: SoundGroup;
  priority: number;
};

const BASE = "/ui_sounds_pack";

export const SOUNDS: Record<SoundKey, SoundConfig> = {
  ui_select: {
    src: `${BASE}/mixkit-player-select-notification-2037.mp3`,
    baseVolume: 0.35,
    cooldownMs: 120,
    group: "ui",
    priority: 1
  },
  map_tap: {
    src: `${BASE}/mixkit-game-ball-tap-2073.wav`,
    baseVolume: 0.3,
    cooldownMs: 80,
    group: "ui",
    priority: 1
  },
  wrong_comarca: {
    src: `${BASE}/mixkit-player-losing-or-failing-2042.wav`,
    baseVolume: 0.5,
    cooldownMs: 260,
    group: "feedback",
    priority: 2
  },
  almost_comarca: {
    src: `${BASE}/mixkit-winning-swoosh-2017.wav`,
    baseVolume: 0.4,
    cooldownMs: 200,
    group: "feedback",
    priority: 2
  },
  correct_comarca: {
    src: `${BASE}/mixkit-instant-win-2021.wav`,
    baseVolume: 0.55,
    cooldownMs: 120,
    group: "feedback",
    priority: 2
  },
  objective_met: {
    src: `${BASE}/mixkit-winning-notification-2018.wav`,
    baseVolume: 0.65,
    cooldownMs: 900,
    group: "reward",
    priority: 3
  },
  treasure_bonus: {
    src: `${BASE}/mixkit-video-game-treasure-2066.wav`,
    baseVolume: 0.6,
    cooldownMs: 900,
    group: "reward",
    priority: 3
  },
  unlock: {
    src: `${BASE}/mixkit-unlock-game-notification-253.wav`,
    baseVolume: 0.6,
    cooldownMs: 900,
    group: "reward",
    priority: 3
  },
  coin_reward: {
    src: `${BASE}/mixkit-winning-a-coin-video-game-2069.wav`,
    baseVolume: 0.35,
    cooldownMs: 90,
    group: "reward",
    priority: 2
  },
  recharge: {
    src: `${BASE}/mixkit-video-game-health-recharge-2837.wav`,
    baseVolume: 0.55,
    cooldownMs: 900,
    group: "reward",
    priority: 3
  },
  level_win: {
    src: `${BASE}/mixkit-game-level-completed-2059.wav`,
    baseVolume: 0.75,
    cooldownMs: 2500,
    group: "outcome",
    priority: 5
  },
  level_perfect: {
    src: `${BASE}/mixkit-ethereal-fairy-win-sound-2019.wav`,
    baseVolume: 0.85,
    cooldownMs: 3000,
    group: "outcome",
    priority: 6
  },
  level_lose: {
    src: `${BASE}/mixkit-losing-piano-2024.wav`,
    baseVolume: 0.7,
    cooldownMs: 3000,
    group: "outcome",
    priority: 6
  }
};
