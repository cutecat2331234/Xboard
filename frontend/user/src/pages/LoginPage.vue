<script setup lang="ts">

import { ref, computed } from 'vue'

import { useRouter } from 'vue-router'

import { NCard, NForm, NFormItem, NInput, NButton, NText, useMessage } from 'naive-ui'
import { getSettings } from '../utils/settings'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const msg = useMessage()
const auth = useAuthStore()
const settings = computed(() => getSettings())
const email = ref('')
const password = ref('')
const errorText = ref('')

async function submit() {
  errorText.value = ''
  try {
    await auth.login({ email: email.value, password: password.value })
    msg.success('登录成功')
    router.push('/dashboard')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '登录失败，请检查邮箱和密码'
    errorText.value = message
    msg.error(message)
  }
}

</script>



<template>

  <div class="auth-page">

    <n-card class="auth-card" :bordered="true">

      <div class="auth-card__header">

        <img v-if="settings.logo" :src="settings.logo" alt="logo" class="auth-card__logo" />

        <n-text strong class="auth-card__title">{{ settings.title || 'Xboard' }}</n-text>

        <n-text depth="3">{{ settings.description || 'Xboard is best' }}</n-text>

      </div>

      <n-form @submit.prevent="submit">

        <n-form-item label="Email">

          <n-input v-model:value="email" placeholder="Email" />

        </n-form-item>

        <n-form-item label="Password">

          <n-input

            v-model:value="password"

            type="password"

            placeholder="Password"

            show-password-on="click"

          />

        </n-form-item>

        <p v-if="errorText" style="color:#d03050;font-size:13px;margin:0 0 8px">{{ errorText }}</p>
        <n-button type="primary" attr-type="submit" block :loading="auth.loading">Login</n-button>

        <div class="auth-card__footer">

          <router-link to="/register">Register</router-link>

          <span>Forgot password</span>

        </div>

      </n-form>

    </n-card>

  </div>

</template>



<style scoped>

.auth-card__header {

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 6px;

  margin-bottom: 20px;

  text-align: center;

}

.auth-card__logo {

  width: 48px;

  height: 48px;

  object-fit: contain;

}

.auth-card__title {

  font-size: 24px;

}

.auth-card__footer {

  margin-top: 14px;

  display: flex;

  justify-content: space-between;

  font-size: 14px;

  color: #666;

}

.auth-card__footer a {

  color: #2080f0;

  text-decoration: none;

}

</style>

