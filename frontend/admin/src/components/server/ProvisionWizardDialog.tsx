import { useCallback, useEffect, useRef, useState } from 'react'

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react'

import { useTranslation } from 'react-i18next'

import { toast } from 'sonner'

import { toastApiError } from '@/lib/api-errors'

import {
  cancelProvision,
  getProvisionStatus,
  retryProvision,
  startProvision,
  type ProvisionAuthMethod,
  type ProvisionCredentials,
  type ProvisionNodeParams,
  type ProvisionStatusResult,
  type ProvisionStep,
} from '@/lib/api'

import { useInFlightGuard } from '@/lib/use-in-flight-guard'

import {
  serverDialogCompactInputCls,
  serverDialogFieldInputCls,
  serverDialogInputCls,
  serverDialogLabelCls,
  textareaCls,
} from '@/lib/form-styles'

import { cn } from '@/lib/utils'

import {
  defaultProtocolSettings,
  ServerProtocolFields,
  toProtocolSettingsPayload,
  type ProtocolFormSettings,
} from '@/components/server/ServerProtocolFields'

import { Button } from '@/components/ui/button'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

import { FormMultiSelect } from '@/components/shared/FormMultiSelect'
import { FormSelect } from '@/components/shared/FormSelect'
import { Label } from '@/components/ui/label'

const NODE_TYPES = [
  'shadowsocks',
  'vmess',
  'trojan',
  'vless',
  'hysteria',
  'tuic',
  'anytls',
] as const

const KERNELS = ['singbox', 'xray'] as const

const POLL_INTERVAL_MS = 2500

const TERMINAL_STATUSES = new Set(['done', 'failed', 'timeout'])

const STEP_ORDER: ProvisionStep['step'][] = [
  'connect',
  'probe',
  'prepare_panel',
  'install_agent',
  'create_server',
  'wait_online',
]

type GroupRow = { id?: number; name?: string }
type MachineRow = { id?: number; name?: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: GroupRow[]
  machines: MachineRow[]
  /** Called once provisioning reaches `done` (so the caller can refresh lists). */
  onDone?: (result: ProvisionStatusResult) => void
}

type SshForm = {
  host: string
  port: string
  ssh_user: string
  auth_method: ProvisionAuthMethod
  password: string
  private_key: string
  passphrase: string
}

type NodeForm = {
  type: string
  name: string
  host: string
  port: string
  server_port: string
  rate: string
  group_ids: number[]
  kernel: (typeof KERNELS)[number]
  machine_id: string
}

function emptySshForm(): SshForm {
  return {
    host: '',
    port: '22',
    ssh_user: 'root',
    auth_method: 'password',
    password: '',
    private_key: '',
    passphrase: '',
  }
}

function emptyNodeForm(): NodeForm {
  return {
    type: '',
    name: '',
    host: '',
    port: '443',
    server_port: '443',
    rate: '1',
    group_ids: [],
    kernel: 'singbox',
    machine_id: '',
  }
}

function StepBadge({ index, active, done }: { index: number; active: boolean; done: boolean }) {
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
        done && 'border-primary bg-primary text-primary-foreground',
        active && !done && 'border-primary text-primary',
        !active && !done && 'border-muted-foreground/30 text-muted-foreground',
      )}
    >
      {index}
    </span>
  )
}

function ProgressStepIcon({ status }: { status: string }) {
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-primary" />
  if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />
  if (status === 'timeout') return <Clock className="h-4 w-4 text-amber-500" />
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-primary" />
  return <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
}

export function ProvisionWizardDialog({ open, onOpenChange, groups, machines, onDone }: Props) {
  const { t } = useTranslation()
  const runGuarded = useInFlightGuard()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [ssh, setSsh] = useState<SshForm>(emptySshForm)
  const [node, setNode] = useState<NodeForm>(emptyNodeForm)
  const [protocolSettings, setProtocolSettings] = useState<ProtocolFormSettings | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [provisionId, setProvisionId] = useState<number | null>(null)
  const [status, setStatus] = useState<ProvisionStatusResult | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingRef = useRef(false)
  // Bumped by clearTimer so an in-flight poll (awaiting the HTTP response when the dialog closed
  // or a new run started) knows it is stale and must not setStatus or re-arm the timer.
  const pollGenRef = useRef(0)
  const logBoxRef = useRef<HTMLPreElement | null>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  // Held only in memory for retry (contract: credentials are not persisted server-side).
  const credsRef = useRef<ProvisionCredentials | null>(null)

  const clearTimer = useCallback(() => {
    pollGenRef.current += 1
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    pollingRef.current = false
  }, [])

  // Reset everything when the dialog closes; always clean up the poll timer + credentials.
  useEffect(() => {
    if (open) return
    clearTimer()
    setStep(1)
    setSsh(emptySshForm())
    setNode(emptyNodeForm())
    setProtocolSettings(null)
    setSubmitting(false)
    setProvisionId(null)
    setStatus(null)
    credsRef.current = null
  }, [open, clearTimer])

  // Cleanup on unmount (prevents timer leak).
  useEffect(() => () => clearTimer(), [clearTimer])

  const poll = useCallback(
    async (id: number) => {
      if (pollingRef.current) return
      const gen = pollGenRef.current
      pollingRef.current = true
      try {
        const result = await getProvisionStatus(id)
        if (gen !== pollGenRef.current) return // dialog closed / superseded while in flight
        setStatus(result)
        if (TERMINAL_STATUSES.has(result.status)) {
          clearTimer()
          if (result.status === 'done') {
            // Credentials no longer needed once finished.
            credsRef.current = null
            onDoneRef.current?.(result)
          }
          return
        }
      } catch (e) {
        // Transient errors shouldn't kill polling; surface once and keep going.
        toastApiError(e, toast, t, t('common.error'))
      } finally {
        pollingRef.current = false
      }
      if (gen !== pollGenRef.current) return
      timerRef.current = setTimeout(() => void poll(id), POLL_INTERVAL_MS)
    },
    [clearTimer, t],
  )

  // Auto-scroll the log box to the bottom on update.
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight
    }
  }, [status?.log])

  function handleTypeChange(type: string) {
    setNode((f) => ({ ...f, type }))
    setProtocolSettings(defaultProtocolSettings(type))
  }

  function validateSsh(): boolean {
    if (!ssh.host.trim()) {
      toast.error(t('machine.provision.errors.hostRequired'))
      return false
    }
    if (!ssh.ssh_user.trim()) {
      toast.error(t('machine.provision.errors.userRequired'))
      return false
    }
    if (ssh.auth_method === 'password' && !ssh.password) {
      toast.error(t('machine.provision.errors.passwordRequired'))
      return false
    }
    if (ssh.auth_method === 'key' && !ssh.private_key.trim()) {
      toast.error(t('machine.provision.errors.keyRequired'))
      return false
    }
    return true
  }

  function goToNodeStep() {
    if (!validateSsh()) return
    setNode((f) => ({ ...f, host: f.host || ssh.host.trim() }))
    setStep(2)
  }

  function buildCredentials(): ProvisionCredentials {
    const creds: ProvisionCredentials = {
      host: ssh.host.trim(),
      port: Number(ssh.port) || 22,
      ssh_user: ssh.ssh_user.trim(),
      auth_method: ssh.auth_method,
    }
    if (ssh.auth_method === 'password') {
      creds.password = ssh.password
    } else {
      creds.private_key = ssh.private_key
      if (ssh.passphrase) creds.passphrase = ssh.passphrase
    }
    return creds
  }

  function buildNodeParams(): ProvisionNodeParams | null {
    if (!node.type) {
      toast.error(t('server.form.type.select_error'))
      return null
    }
    if (!node.name.trim()) {
      toast.error(t('machine.provision.errors.nameRequired'))
      return null
    }
    if (!node.host.trim()) {
      toast.error(t('machine.provision.errors.nodeHostRequired'))
      return null
    }
    const protocol = protocolSettings ?? defaultProtocolSettings(node.type)
    const protocol_settings = protocol ? toProtocolSettingsPayload(node.type, protocol) : {}
    return {
      type: node.type,
      name: node.name.trim(),
      host: node.host.trim(),
      port: node.port,
      server_port: Number(node.server_port),
      rate: Number(node.rate) || 1,
      group_ids: node.group_ids,
      protocol_settings,
      kernel: node.kernel,
      machine_id: node.machine_id ? Number(node.machine_id) : null,
    }
  }

  async function submitStart() {
    const node_params = buildNodeParams()
    if (!node_params) return
    await runGuarded('provision:start', async () => {
      setSubmitting(true)
      try {
        const creds = buildCredentials()
        const res = await startProvision({ ...creds, node_params })
        // Keep credentials in memory only for a potential retry, then move on.
        credsRef.current = creds
        setProvisionId(res.provision_id)
        setStatus({ id: res.provision_id, status: res.status })
        setStep(3)
        clearTimer()
        void poll(res.provision_id)
      } catch (e) {
        toastApiError(e, toast, t, t('common.error'))
      } finally {
        setSubmitting(false)
      }
    })
  }

  async function submitRetry() {
    if (!provisionId) return
    const creds = credsRef.current
    if (!creds) {
      // Credentials are not persisted; bounce the user back to re-enter them.
      toast.error(t('machine.provision.errors.credentialsExpired'))
      setStep(1)
      return
    }
    await runGuarded('provision:retry', async () => {
      setSubmitting(true)
      try {
        const res = await retryProvision(provisionId, creds)
        setProvisionId(res.provision_id)
        setStatus({ id: res.provision_id, status: res.status })
        clearTimer()
        void poll(res.provision_id)
      } catch (e) {
        toastApiError(e, toast, t, t('common.error'))
      } finally {
        setSubmitting(false)
      }
    })
  }

  async function handleCancel() {
    if (!provisionId) {
      onOpenChange(false)
      return
    }
    await runGuarded('provision:cancel', async () => {
      try {
        await cancelProvision(provisionId)
        clearTimer()
        toast.success(t('common.success'))
        onOpenChange(false)
      } catch (e) {
        toastApiError(e, toast, t, t('common.error'))
      }
    })
  }

  const steps: ProvisionStep[] = (() => {
    const byName = new Map((status?.steps ?? []).map((s) => [s.step, s]))
    return STEP_ORDER.map(
      (name) => byName.get(name) ?? { step: name, status: 'pending' as const },
    )
  })()

  const isTerminal = status ? TERMINAL_STATUSES.has(status.status) : false
  const isDone = status?.status === 'done'
  const isFailed = status?.status === 'failed'
  const isTimeout = status?.status === 'timeout'

  const groupOptions = groups
    .filter((g): g is GroupRow & { id: number } => g.id != null)
    .map((g) => ({ value: g.id, label: String(g.name) }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[576px]">
        <div className="shrink-0 border-b px-6 pb-4 pt-6">
          <DialogTitle className="font-mono text-lg font-semibold tracking-tight">
            {t('machine.provision.title')}
          </DialogTitle>
          <DialogDescription className="mt-1.5 font-mono text-xs opacity-70">
            {t('machine.provision.description')}
          </DialogDescription>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <StepBadge index={1} active={step === 1} done={step > 1} />
              <span className={cn(step === 1 && 'font-medium')}>{t('machine.provision.steps.ssh')}</span>
            </div>
            <span className="h-px w-4 bg-muted-foreground/30" />
            <div className="flex items-center gap-1.5">
              <StepBadge index={2} active={step === 2} done={step > 2} />
              <span className={cn(step === 2 && 'font-medium')}>{t('machine.provision.steps.node')}</span>
            </div>
            <span className="h-px w-4 bg-muted-foreground/30" />
            <div className="flex items-center gap-1.5">
              <StepBadge index={3} active={step === 3} done={isDone} />
              <span className={cn(step === 3 && 'font-medium')}>{t('machine.provision.steps.progress')}</span>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
          {/* Step 1 — SSH connection */}
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className={serverDialogLabelCls}>{t('machine.provision.ssh.host')}</Label>
                <input
                  className={serverDialogFieldInputCls}
                  placeholder={t('machine.provision.ssh.hostPlaceholder')}
                  value={ssh.host}
                  onChange={(e) => setSsh((f) => ({ ...f, host: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className={serverDialogLabelCls}>{t('machine.provision.ssh.port')}</Label>
                  <input
                    className={serverDialogFieldInputCls}
                    placeholder="22"
                    value={ssh.port}
                    onChange={(e) => setSsh((f) => ({ ...f, port: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={serverDialogLabelCls}>{t('machine.provision.ssh.user')}</Label>
                  <input
                    className={serverDialogFieldInputCls}
                    placeholder="root"
                    value={ssh.ssh_user}
                    onChange={(e) => setSsh((f) => ({ ...f, ssh_user: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className={serverDialogLabelCls}>{t('machine.provision.ssh.authMethod')}</Label>
                <FormSelect
                  className={serverDialogInputCls}
                  value={ssh.auth_method}
                  onChange={(v) => setSsh((f) => ({ ...f, auth_method: v as ProvisionAuthMethod }))}
                  options={[
                    { value: 'password', label: t('machine.provision.ssh.authPassword') },
                    { value: 'key', label: t('machine.provision.ssh.authKey') },
                  ]}
                />
              </div>
              {ssh.auth_method === 'password' ? (
                <div className="space-y-1">
                  <Label className={serverDialogLabelCls}>{t('machine.provision.ssh.password')}</Label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={serverDialogFieldInputCls}
                    placeholder={t('machine.provision.ssh.passwordPlaceholder')}
                    value={ssh.password}
                    onChange={(e) => setSsh((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className={serverDialogLabelCls}>{t('machine.provision.ssh.privateKey')}</Label>
                    <textarea
                      className={cn(textareaCls, 'min-h-[140px] font-mono text-xs')}
                      placeholder={'-----BEGIN OPENSSH PRIVATE KEY-----\n...'}
                      spellCheck={false}
                      autoComplete="off"
                      value={ssh.private_key}
                      onChange={(e) => setSsh((f) => ({ ...f, private_key: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={serverDialogLabelCls}>
                      {t('machine.provision.ssh.passphrase')}
                      <span className="ml-1 text-muted-foreground">
                        ({t('server.form.code.optional')})
                      </span>
                    </Label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={serverDialogFieldInputCls}
                      value={ssh.passphrase}
                      onChange={(e) => setSsh((f) => ({ ...f, passphrase: e.target.value }))}
                    />
                  </div>
                </>
              )}
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t('machine.provision.ssh.securityHint')}
              </p>
            </div>
          ) : null}

          {/* Step 2 — Node parameters */}
          {step === 2 ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="min-w-0 flex-[2] space-y-1">
                  <Label className={serverDialogLabelCls}>{t('server.form.name.label')}</Label>
                  <input
                    className={serverDialogFieldInputCls}
                    placeholder={t('server.form.name.placeholder')}
                    value={node.name}
                    onChange={(e) => setNode((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className={serverDialogLabelCls}>{t('server.form.type.placeholder')}</Label>
                  <FormSelect
                    className={serverDialogInputCls}
                    value={node.type}
                    onChange={handleTypeChange}
                    options={[
                      { value: '', label: t('server.form.type.placeholder') },
                      ...NODE_TYPES.map((tp) => ({ value: tp, label: tp })),
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className={serverDialogLabelCls}>{t('server.form.host.label')}</Label>
                <input
                  className={serverDialogFieldInputCls}
                  placeholder={t('server.form.host.placeholder')}
                  value={node.host}
                  onChange={(e) => setNode((f) => ({ ...f, host: e.target.value }))}
                />
              </div>

              <div className="flex gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className={serverDialogLabelCls}>{t('server.form.port.label')}</Label>
                  <input
                    className={serverDialogFieldInputCls}
                    placeholder={t('server.form.port.placeholder')}
                    value={node.port}
                    onChange={(e) => setNode((f) => ({ ...f, port: e.target.value }))}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className={serverDialogLabelCls}>{t('server.form.server_port.label')}</Label>
                  <input
                    className={serverDialogFieldInputCls}
                    placeholder={t('server.form.server_port.placeholder')}
                    value={node.server_port}
                    onChange={(e) => setNode((f) => ({ ...f, server_port: e.target.value }))}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className={serverDialogLabelCls}>{t('server.form.rate.label')}</Label>
                  <input
                    type="number"
                    className={serverDialogFieldInputCls}
                    value={node.rate}
                    onChange={(e) => setNode((f) => ({ ...f, rate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className={serverDialogLabelCls}>{t('machine.provision.node.kernel')}</Label>
                  <FormSelect
                    className={serverDialogCompactInputCls}
                    value={node.kernel}
                    onChange={(v) => setNode((f) => ({ ...f, kernel: v as (typeof KERNELS)[number] }))}
                    options={KERNELS.map((k) => ({ value: k, label: k }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={serverDialogLabelCls}>{t('machine.provision.node.machine')}</Label>
                  <FormSelect
                    className={serverDialogCompactInputCls}
                    value={node.machine_id}
                    onChange={(v) => setNode((f) => ({ ...f, machine_id: v }))}
                    options={[
                      { value: '', label: t('machine.provision.node.machineNew') },
                      ...machines.map((m) => ({ value: String(m.id), label: String(m.name) })),
                    ]}
                  />
                  <p className="m-0 text-[11px] leading-tight text-muted-foreground">
                    {t('machine.provision.node.machineHint')}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className={serverDialogLabelCls}>{t('server.form.groups.label')}</Label>
                <FormMultiSelect
                  className={serverDialogCompactInputCls}
                  value={node.group_ids}
                  onChange={(group_ids) => setNode((f) => ({ ...f, group_ids }))}
                  options={groupOptions}
                  placeholder={t('server.form.groups.placeholder')}
                  emptyText={t('server.form.groups.empty')}
                />
              </div>

              {protocolSettings ? (
                <ServerProtocolFields
                  type={node.type}
                  value={protocolSettings}
                  onChange={setProtocolSettings}
                />
              ) : null}
            </div>
          ) : null}

          {/* Step 3 — Progress */}
          {step === 3 ? (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border p-3">
                {steps.map((s) => (
                  <div key={s.step} className="flex items-center gap-2.5 text-sm">
                    <ProgressStepIcon status={s.status} />
                    <span
                      className={cn(
                        s.status === 'running' && 'font-medium',
                        (s.status === 'failed' || s.status === 'timeout') && 'text-destructive',
                      )}
                    >
                      {t(`machine.provision.progressSteps.${s.step}`)}
                    </span>
                  </div>
                ))}
              </div>

              {isDone ? (
                <p className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {t('machine.provision.result.done')}
                </p>
              ) : null}
              {isFailed ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium text-destructive">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {t('machine.provision.result.failed')}
                  </p>
                  {status?.error ? (
                    <p className="mt-1 break-all font-mono text-xs text-destructive/90">{status.error}</p>
                  ) : null}
                </div>
              ) : null}
              {isTimeout ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium text-amber-600">
                    <Clock className="h-4 w-4 shrink-0" />
                    {t('machine.provision.result.timeout')}
                  </p>
                  {status?.error ? (
                    <p className="mt-1 break-all font-mono text-xs">{status.error}</p>
                  ) : null}
                </div>
              ) : null}

              {status?.host_key_fingerprint ? (
                <div className="space-y-1">
                  <Label className={serverDialogLabelCls}>
                    {t('machine.provision.result.hostKey')}
                  </Label>
                  <code className="block break-all rounded border bg-muted/50 p-2 font-mono text-[11px]">
                    {status.host_key_fingerprint}
                  </code>
                </div>
              ) : null}

              <div className="space-y-1">
                <Label className={serverDialogLabelCls}>{t('machine.provision.result.log')}</Label>
                <pre
                  ref={logBoxRef}
                  className="max-h-64 overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all"
                >
                  {status?.log || t('machine.provision.result.noLog')}
                </pre>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex h-[62px] shrink-0 items-center justify-between gap-3 border-t px-6 py-3">
          <div className="flex items-center gap-2">
            {step === 2 ? (
              <Button
                type="button"
                variant="ghost"
                className="h-8 gap-1.5 px-3 text-xs font-bold"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('machine.provision.actions.back')}
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {step === 1 ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-4 text-xs font-bold"
                  onClick={() => onOpenChange(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  className="h-8 gap-1.5 px-8 text-xs font-bold"
                  onClick={goToNodeStep}
                >
                  {t('machine.provision.actions.next')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-4 text-xs font-bold"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  className="h-8 gap-2 px-8 text-xs font-bold"
                  onClick={submitStart}
                  disabled={submitting || !node.type}
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {t('machine.provision.actions.start')}
                </Button>
              </>
            ) : null}

            {step === 3 ? (
              <>
                {isFailed || isTimeout ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 gap-2 px-4 text-xs font-bold"
                    onClick={submitRetry}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {t('machine.provision.actions.retry')}
                  </Button>
                ) : null}
                {!isTerminal ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-4 text-xs font-bold"
                    onClick={handleCancel}
                  >
                    {t('machine.provision.actions.cancel')}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="h-8 px-8 text-xs font-bold"
                  onClick={() => onOpenChange(false)}
                >
                  {t('common.close')}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
