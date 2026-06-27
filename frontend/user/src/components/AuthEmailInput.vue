<script setup lang="ts">
import { computed } from 'vue'
import { NInput, NSelect } from 'naive-ui'
import { composeEmail } from '@/lib/email-address'
import { useI18n } from '@/i18n'

const props = defineProps<{
  suffixes?: string[] | 0
  autofocus?: boolean
}>()

const emailLocal = defineModel<string>('local', { default: '' })
const emailFull = defineModel<string>('full', { default: '' })
const emailSuffix = defineModel<string>('suffix', { default: '' })

const { t } = useI18n()

const enabled = computed(() => Array.isArray(props.suffixes) && props.suffixes.length > 0)

const suffixOptions = computed(() =>
  (props.suffixes as string[] | undefined)?.map((s) => ({ label: `@${s}`, value: `@${s}` })) ?? [],
)

function onLocalUpdate(v: string) {
  emailLocal.value = v
  emailFull.value = composeEmail(v, emailSuffix.value, emailFull.value)
}

function onFullUpdate(v: string) {
  emailFull.value = v
}

function onSuffixUpdate(v: string) {
  emailSuffix.value = v
  emailFull.value = composeEmail(emailLocal.value, v, emailFull.value)
}

defineExpose({
  getEmail: () => composeEmail(emailLocal.value, emailSuffix.value, emailFull.value),
})
</script>

<template>
  <n-input
    v-if="enabled"
    :value="emailLocal"
    :placeholder="t('email')"
    :autofocus="autofocus"
    @update:value="onLocalUpdate"
  >
    <template #suffix>
      <n-select
        v-if="suffixOptions.length > 1"
        :value="emailSuffix"
        :options="suffixOptions"
        size="small"
        :consistent-menu-width="false"
        style="min-width: 120px"
        @update:value="onSuffixUpdate"
      />
      <span v-else class="email-suffix">{{ emailSuffix }}</span>
    </template>
  </n-input>
  <n-input
    v-else
    :value="emailFull"
    type="text"
    :placeholder="t('email')"
    :autofocus="autofocus"
    @update:value="onFullUpdate"
  />
</template>

<style scoped>
.email-suffix {
  color: #666;
  font-size: 14px;
  padding-left: 4px;
}
</style>
