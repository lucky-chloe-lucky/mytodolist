import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-ink text-white hover:bg-ink/90 shadow-sm',
    ghost: 'text-muted hover:bg-canvas',
    subtle: 'bg-canvas text-ink hover:bg-line',
    danger: 'text-red-600 hover:bg-red-50',
  }
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}

const inputBase =
  'w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputBase, props.className)} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={cx(inputBase, 'resize-y', props.className)} />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputBase, props.className)} />
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        'rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: string
  title: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line py-14 text-center">
      <div className="text-4xl">{icon}</div>
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
