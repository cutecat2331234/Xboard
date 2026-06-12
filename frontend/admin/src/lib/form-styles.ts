export const inputCls =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export const textareaCls =
  'flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

/** 7001 config form labels: 11px / semibold / leading-5 (lh 20px) */
export const configFieldLabelCls =
  'text-[11px] font-semibold leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

/** 7001 dialog form labels (user-create, send-mail, etc.): uppercase 11px */
export const dialogFieldLabelCls =
  'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'

export const dialogInputCls =
  'h-9 font-mono text-xs shadow-none'

/** 7001 dialog FormSelect triggers: mono xs + compact chevron, no input shadow. */
export const dialogSelectCls =
  'h-9 font-mono text-xs shadow-none [&_svg]:h-3 [&_svg]:w-3'

/** 7001 dialog SuffixInput prefix/suffix addon (h-9 mono xs). */
export const dialogSuffixAddonCls =
  'inline-flex h-9 shrink-0 items-center border border-input bg-transparent px-3 font-mono text-xs text-muted-foreground shadow-none'

/** 7001 server node dialog labels: mono 12px, not uppercase */
export const serverFieldLabelCls = 'font-mono text-[12px] text-foreground/80'

/** 7001 plan tags/group/content labels: shadcn FormLabel default */
export const dialogSubFieldLabelCls =
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

/** 7001 invite distribution sub-fields: shadcn FormLabel default (text-sm) */
export const configSubFieldLabelCls =
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

/** 7001 user-edit sheet labels: standard FormLabel (text-sm / leading-5). */
export const sheetFieldLabelCls =
  'text-sm font-medium leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

/** 7001 shadcn FormDescription slot (empty on server multiselect rows). */
export const formSubLabelCls = 'm-0 text-[0.8rem] text-muted-foreground'

/** 7001 server protocol subsection: mono labels + compact inputs (no extra border — legacy is flat) */
export const serverProtocolFieldsCls =
  'xb-stack-6 [&_label]:font-mono [&_label]:text-[12px] [&_label]:text-foreground/80 [&_input:not([type=checkbox])]:h-9 [&_input]:font-mono [&_input]:text-xs [&_textarea]:font-mono [&_textarea]:text-xs'
