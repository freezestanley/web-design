import { create } from 'zustand'

/**
 * 用户信息 store
 * user 字段结构由 SSO /userinfo 接口返回的 result 决定
 */
export const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))
