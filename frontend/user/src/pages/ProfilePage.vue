<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NForm, NFormItem, NInput, NButton, useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { changePassword, resetSecurity } from '@/api/profile'
import { useI18n } from '@/i18n'

const auth = useAuthStore()
const oldPassword = ref('')
const newPassword = ref('')
const msg = useMessage()
const { t } = useI18n()

async function submitPassword() {
  try {
    await changePassword({ old_password: oldPassword.value, new_password: newPassword.value })
    msg.success('Password updated')
    oldPassword.value = ''
    newPassword.value = ''
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : 'Failed')
  }
}

async function reset() {
  try {
    await resetSecurity()
    msg.success('Reset link sent')
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : 'Failed')
  }
}

onMounted(() => auth.loadUser())
</script>

<template>
  <h2 class="page-title">{{ t('nav.profile') }}</h2>
  <n-card title="Account" style="margin-bottom:16px">
    <p><strong>Email:</strong> {{ auth.user?.email }}</p>
    <p><strong>UUID:</strong> {{ auth.user?.uuid }}</p>
  </n-card>
  <n-card title="Change Password">
    <n-form @submit.prevent="submitPassword">
      <n-form-item label="Old Password"><n-input v-model:value="oldPassword" type="password" show-password-on="click" /></n-form-item>
      <n-form-item label="New Password"><n-input v-model:value="newPassword" type="password" show-password-on="click" /></n-form-item>
      <n-button type="primary" attr-type="submit">{{ t('common.save') }}</n-button>
      <n-button style="margin-left:8px" @click="reset">Reset Subscribe</n-button>
    </n-form>
  </n-card>
</template>
