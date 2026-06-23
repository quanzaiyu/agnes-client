import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';

export interface UserProfile { nickname: string; avatar: string; }

export const useUserStore = defineStore('user', () => {
  const profile = $ref<UserProfile>(storage.get<UserProfile>('user_profile', { nickname: '', avatar: '' }));

  function setProfile(p: Partial<UserProfile>) {
    profile.nickname = p.nickname ?? profile.nickname;
    profile.avatar = p.avatar ?? profile.avatar;
    storage.set('user_profile', { nickname: profile.nickname, avatar: profile.avatar });
  }

  return $$({ profile, setProfile });
});