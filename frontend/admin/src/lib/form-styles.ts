import { cn } from '@/lib/utils'

export const inputCls =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export const textareaCls =
  'flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

/** 7001 config form labels: 11px / semibold / leading-5 (lh 20px) */
export const configFieldLabelCls =
  'text-[11px] font-semibold leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

/** 7001 dialog form labels (user-create, send-mail, etc.): uppercase 11px / lh 14px */
export const dialogFieldLabelCls =
  'text-[11px] font-semibold uppercase leading-none tracking-wider text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

/** 7001 gift-card template dialog section cards */
export const giftSectionCardCls = 'space-y-4 rounded-xl border bg-card/50 p-4'

/** 7001 dialog uppercase-field inputs: standard inputCls, measured 34px. */
export const dialogPlainFieldInputCls = cn(
  inputCls,
  'h-[34px] min-h-[34px] max-h-[34px] py-1 shadow-sm',
)

/** 7001 send-mail dialog inputs (no mono). */
export const dialogMailInputCls = cn(inputCls, 'h-[34px] py-1 shadow-sm bg-transparent')

/** 7001 send-mail content textarea. */
export const dialogMailTextareaCls = cn(
  textareaCls,
  'h-[209px] min-h-[209px] max-h-[209px] py-2 shadow-sm bg-transparent',
)

/** 7001 gift-card template description textarea (80px, overrides textareaCls min-h). */
export const giftDescriptionTextareaCls = cn(
  textareaCls,
  '!h-[80px] !min-h-[80px] !max-h-[80px] py-2 font-mono text-xs shadow-sm',
)

/** 7001 gift-card template dialog inputs (36px). */
export const giftDialogInputCls = cn(
  inputCls,
  'h-[36px] min-h-[36px] max-h-[36px] py-1 font-mono text-xs bg-background shadow-none',
)

/** 7001 gift-card template dialog FormSelect triggers (36px). */
export const giftDialogSelectCls =
  'h-[36px] min-h-[36px] py-1 font-mono text-xs shadow-none [&_svg]:h-3 [&_svg]:w-3'

/** 7001 server node dialog inputs (36px mono). */
export const serverDialogFieldInputCls = cn(
  inputCls,
  'h-[36px] min-h-[36px] max-h-[36px] py-1 font-mono text-xs shadow-sm bg-transparent',
)

/** 7001 server node dialog FormSelect / multiselect triggers (36px). */
export const serverDialogInputCls =
  'h-[36px] min-h-[36px] max-h-[36px] py-1 font-mono text-xs shadow-none [&_svg]:h-3 [&_svg]:w-3'

/** 7001 server node dialog compact triggers/number fields (32px). */
export const serverDialogCompactInputCls =
  'h-[32px] min-h-[32px] max-h-[32px] py-1 font-mono text-xs shadow-none [&_svg]:h-3 [&_svg]:w-3'

/** 7001 server protocol subsection inputs (30px compact). */
export const serverProtocolInputCls = cn(
  inputCls,
  'h-[30px] min-h-[30px] max-h-[30px] py-0 font-mono text-xs shadow-none',
)

export const dialogInputCls =
  'h-[34px] min-h-[34px] max-h-[34px] bg-background py-0 font-mono text-xs shadow-none'

export function dialogFieldInputCls(extra?: string) {
  return cn(dialogPlainFieldInputCls, 'font-mono text-xs', extra)
}

/** 7001 user-create dialog inputs (mono xs). */
export const dialogCompactInputCls = cn(dialogPlainFieldInputCls, 'font-mono text-xs bg-background')

/** 7001 dialog FormSelect triggers: mono xs + compact chevron, no input shadow. */
export const dialogSelectCls =
  'h-[34px] min-h-[34px] py-1 font-mono text-xs shadow-none [&_svg]:h-3 [&_svg]:w-3'

/** 7001 dialog SuffixInput prefix/suffix addon (h-9 mono xs). */
export const dialogSuffixAddonCls =
  'inline-flex h-[34px] min-h-[34px] shrink-0 items-center border border-input bg-transparent px-3 font-mono text-xs text-muted-foreground shadow-none'

/** 7001 server node dialog labels: shadcn FormLabel default (font-medium text-sm). */
export const serverDialogLabelCls =
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

/** 7001 server protocol subsection labels: mono 12px */
export const serverFieldLabelCls = 'font-mono text-[12px] text-foreground/80'

/** 7001 plan tags/group/content labels: shadcn FormLabel default */
export const dialogSubFieldLabelCls =
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

/** 7001 invite distribution sub-fields: shadcn FormLabel default (text-sm) */
export const configSubFieldLabelCls =
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

/** 7001 user-edit sheet labels: FormLabel text-sm / leading-none (measured 19px block). */
export const sheetFieldLabelCls =
  'block min-h-[19px] text-sm font-medium leading-[19px] peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

/** 7001 user-edit sheet field stack (measured block min-heights from 7001 ref). */
export const editSheetFieldCls = 'flex flex-col gap-2.5 min-h-[68px]'

/** 7001 user-edit expire row (measured 58px). */
export const editSheetExpireFieldCls = 'flex flex-col gap-2.5 min-h-[58px]'

/** 7001 user-edit switch rows (measured 72px incl. py-2 wrap). */
export const editSheetSwitchFieldCls = 'flex flex-col gap-2.5 min-h-[72px]'

/** 7001 user-edit remarks row (measured 128px). */
export const editSheetRemarksFieldCls = 'flex flex-col gap-2.5 min-h-[128px]'

/** 7001 user-edit sheet expire trigger (36px, non-mono). */
export const editSheetExpireBtnCls =
  '!h-9 !min-h-9 !max-h-9 bg-transparent text-sm font-normal shadow-sm [&_svg]:h-3 [&_svg]:w-3'

/** 7001 user-edit sheet switch row inner wrapper. */
export const editSheetSwitchWrapCls = 'py-2'

/** 7001 user-edit sheet FormSelect triggers (36px). */
export const editSheetSelectCls =
  'h-9 min-h-9 max-h-9 py-1 shadow-none [&_svg]:h-3 [&_svg]:w-3'

/** 7001 shadcn FormDescription slot (empty on server multiselect rows). */
export const formSubLabelCls = 'm-0 text-[0.8rem] text-muted-foreground'

/** 7001 server protocol subsection: mono labels + compact inputs (no extra border — legacy is flat) */
export const serverProtocolFieldsCls =
  'xb-stack-6 [&_label]:font-mono [&_label]:text-[12px] [&_label]:text-foreground/80 [&_input:not([type=checkbox])]:h-9 [&_input]:font-mono [&_input]:text-xs [&_textarea]:font-mono [&_textarea]:text-xs'
