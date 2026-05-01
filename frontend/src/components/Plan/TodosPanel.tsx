import { CheckCircle2, Circle, Trash2, ListTodo } from "lucide-react"

type TodoItem = { text: string; done: boolean }

export default function TodosPanel({
  items,
  onToggle,
  onClear,
}: {
  items: TodoItem[]
  onToggle: (idx: number) => void
  onClear: () => void
}) {
  const total = items.length
  const done = items.filter((i) => i.done).length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ListTodo size={15} className="text-[color:var(--accent)]" />
          Tasks
          <span className="text-xs text-[color:var(--muted-foreground)] font-normal">
            {done}/{total}
          </span>
        </div>
        {total > 0 && (
          <button
            onClick={onClear}
            className="nc-icon-btn w-8 h-8"
            title="Clear all tasks"
            aria-label="Clear all tasks"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {total > 0 && (
        <div className="px-4 pt-3">
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7c5cff] to-[#22d3ee] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[11px] text-[color:var(--muted-foreground)] mt-1">{pct}% complete</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {total === 0 ? (
          <EmptyState
            icon={<ListTodo size={24} className="text-[color:var(--muted-foreground)]" />}
            title="No tasks yet"
            description="When the agent plans work, tasks appear here. Toggle as you go."
          />
        ) : (
          <ul className="space-y-1.5">
            {items.map((item, idx) => (
              <li key={idx}>
                <button
                  onClick={() => onToggle(idx)}
                  className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-xl border transition group ${
                    item.done
                      ? "bg-white/[0.02] border-[color:var(--border)] text-[color:var(--muted-foreground)]"
                      : "bg-[color:var(--surface-2)] border-[color:var(--border)] hover:border-[color:var(--border-strong)] text-[color:var(--foreground)]"
                  }`}
                >
                  <span className={item.done ? "text-[color:var(--success)]" : "text-[color:var(--muted-foreground)] group-hover:text-[color:var(--accent)]"}>
                    {item.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </span>
                  <span className={`text-sm leading-snug ${item.done ? "line-through" : ""}`}>{item.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-8">
      <div className="h-12 w-12 rounded-2xl bg-[color:var(--surface-2)] border border-[color:var(--border)] flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="text-sm font-semibold text-[color:var(--foreground)]">{title}</div>
      <div className="text-xs text-[color:var(--muted-foreground)] mt-1 max-w-[260px]">{description}</div>
    </div>
  )
}
