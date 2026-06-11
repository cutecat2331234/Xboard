import { defineStore } from 'pinia'
import { ref } from 'vue'
import { checkLogin as apiCheckLogin } from '@/api/user'
import { clearAuthData, getAuthData } from '@/api'
import { login as apiLogin, logout as apiLogout, register as apiRegister } from '@/api/auth'
import type { AuthFormPayload, LoginForm, RegisterForm } from '@/api/auth'
import type { UserInfo } from '@/api/user'
import { fetchUserInfo } from '@/api/user'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(Boolean(getAuthData()))
  const user = ref<UserInfo | null>(null)
  const loading = ref(false)

  async function login(form: LoginForm) {
    loading.value = true
    try {
      await apiLogin(form)
      isAuthenticated.value = true
      await loadUser()
    } finally {
      loading.value = false
    }
  }

  async function register(form: RegisterForm & AuthFormPayload) {
    loading.value = true
    try {
      await apiRegister(form)
      isAuthenticated.value = true
      await loadUser()
    } finally {
      loading.value = false
    }
  }

  async function loadUser() {
    if (!getAuthData()) {
      user.value = null
      isAuthenticated.value = false
      return
    }

    try {
      user.value = await fetchUserInfo()
      isAuthenticated.value = true
    } catch {
      user.value = null
      isAuthenticated.value = false
    }
  }

  async function checkSession() {
    if (!getAuthData()) {
      isAuthenticated.value = false
      return false
    }

    try {
      const result = await apiCheckLogin()
      isAuthenticated.value = result.is_login
      if (result.is_login) {
        await loadUser()
      } else {
        clearAuthData()
      }
      return result.is_login
    } catch {
      clearAuthData()
      isAuthenticated.value = false
      return false
    }
  }

  function logout() {
    apiLogout()
    user.value = null
    isAuthenticated.value = false
  }

  return {
    isAuthenticated,
    user,
    loading,
    login,
    register,
    loadUser,
    checkSession,
    logout,
  }
})
