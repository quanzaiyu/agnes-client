import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';
import { pointsApi } from '@/api/points';

const KEY_BALANCE = 'points_balance';
const KEY_CHECKIN = 'last_checkin_date';
const KEY_HISTORY = 'points_history';
const COST = { text: 1, image: 1, video: 10 };

export const usePointsStore = defineStore('points', {
  state: () => ({
    balance: storage.get<number>(KEY_BALANCE, 100),
    lastCheckinDate: storage.get<string>(KEY_CHECKIN, ''),
    history: storage.get<{ date: string; delta: number; reason: string }[]>(KEY_HISTORY, [])
  }),
  getters: {
    checkedInToday: (s) => s.lastCheckinDate === new Date().toISOString().split('T')[0]
  },
  actions: {
    setBalance(n: number) { this.balance = n; storage.set(KEY_BALANCE, n); },
    addBalance(delta: number) { this.setBalance(this.balance + delta); },
    deduct(type: 'text' | 'image' | 'video') {
      const cost = COST[type];
      if (this.balance < cost) throw new Error('积分不足');
      this.setBalance(this.balance - cost);
      this._appendHistory(-cost, `${type === 'text' ? '文本' : type === 'image' ? '图片' : '视频'}生成`);
    },
    refund(type: 'text' | 'image' | 'video', reason = '生成失败') {
      const cost = COST[type];
      this.setBalance(this.balance + cost);
      this._appendHistory(cost, reason);
    },
    async checkin() {
      if (this.checkedInToday) throw new Error('今日已签到');
      this.addBalance(10);
      this.lastCheckinDate = new Date().toISOString().split('T')[0];
      storage.set(KEY_CHECKIN, this.lastCheckinDate);
      this._appendHistory(10, '每日签到');
      // 尝试同步到后端（如果未来登录）
      try { await pointsApi.checkin(); } catch {}
    },
    _appendHistory(delta: number, reason: string) {
      const entry = { date: new Date().toISOString(), delta, reason };
      this.history = [entry, ...this.history].slice(0, 200);
      storage.set(KEY_HISTORY, this.history);
    }
  }
});