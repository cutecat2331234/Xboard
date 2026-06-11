<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadStripe, type Stripe, type StripeCardElement } from '@stripe/stripe-js'
import { fetchStripePublicKey } from '@/api/comm'

const props = defineProps<{
  paymentId: number | null
}>()

const mountId = `stripe-card-${Math.random().toString(36).slice(2)}`
const ready = ref(false)
let stripe: Stripe | null = null
let card: StripeCardElement | null = null

async function mount() {
  ready.value = false
  if (!props.paymentId) return
  try {
    const pk = await fetchStripePublicKey(props.paymentId)
    stripe = await loadStripe(pk)
    if (!stripe) return
    const elements = stripe.elements()
    card?.destroy()
    card = elements.create('card', { hidePostalCode: true })
    card.mount(`#${mountId}`)
    ready.value = true
  } catch {
    ready.value = false
  }
}

async function createToken(): Promise<string | undefined> {
  if (!stripe || !card) return undefined
  const { token, error } = await stripe.createToken(card)
  if (error) throw new Error(error.message || 'Stripe token failed')
  return token?.id
}

onMounted(mount)
watch(() => props.paymentId, mount)
onBeforeUnmount(() => {
  card?.destroy()
  card = null
})

defineExpose({ createToken, ready })
</script>

<template>
  <div v-show="paymentId" class="stripe-card-wrap">
    <div :id="mountId" class="stripe-card-mount" />
  </div>
</template>

<style scoped>
.stripe-card-wrap {
  margin: 12px 0 4px;
  padding: 12px;
  border: 1px solid #efeff5;
  border-radius: 3px;
  background: #fff;
}
.stripe-card-mount {
  min-height: 40px;
}
</style>
