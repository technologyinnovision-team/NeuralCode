type TodoItem = {
  text: string
  done: boolean
}

export default function StickyTodos({
  items,
  onToggle,
  onClear
}: {
  items: TodoItem[]
  onToggle: (idx: number) => void
  onClear: () => void
}) {
  if (!items.length) return null

  const doneCount = items.filter(i => i.done).length

  return (
    <div className="w-full max-w-[980px] mb-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-[color:var(--foreground)]">
          TODOS ({doneCount}/{items.length})
        </div>
        <button
          onClick={onClear}
          className="text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        >
          Hide
        </button>
      </div>

      <div className="mt-2 max-h-[160px] overflow-y-auto space-y-1">
        {items.slice(0, 30).map((item, idx) => (
          <label key={idx} className="flex items-start gap-2 text-xs text-[color:var(--foreground)]">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => onToggle(idx)}
              className="mt-0.5"
            />
            <span className={item.done ? "line-through text-[color:var(--muted-foreground)]" : ""}>
              {item.text}
            </span>
          </label>
        ))}
        {items.length > 30 && (
          <div className="text-[11px] text-[color:var(--muted-foreground)]">
            Showing first 30 items…
          </div>
        )}
      </div>
    </div>
  )
}

