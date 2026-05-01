import { useMemo } from "react"
import { Sparkles, User } from "lucide-react"
import MarkdownRenderer from "../MarkdownRenderer"
import { ToolStreamingCard, ToolResultCard } from "./ToolCard"
import CodeDiffCard from "./CodeDiffCard"
import type { PendingChange } from "./ChatLayout"

const FILE_EDIT_TOOLS = new Set(["lines_editor", "create_file", "write_file"])

type ToolEvent =
  | { type: "plan"; sequence: number; toolCall: Record<string, unknown> }
  | { type: "block_start"; sequence: number; toolCallId: string; tag_name?: string; tool_name?: string; attributes?: Record<string, unknown> }
  | { type: "block_update"; sequence: number; toolCallId: string; payload: string; isStreaming: boolean }
  | { type: "loading"; sequence: number; toolCallId: string; tool_name: string; tag_name?: string; is_loading: boolean; delay_seconds?: number }
  | { type: "result"; sequence: number; toolCallId: string; result: unknown; tool_name?: string; tag_name?: string; attributes?: Record<string, unknown> }

type StreamTextEvent = { type: "text"; content: string }
type RawEvent = StreamTextEvent | ToolEvent

type RenderText = { kind: "text"; content: string; key: string }
type RenderTool = {
  kind: "tool"
  key: string
  toolCallId: string
  name: string
  args?: Record<string, unknown>
  status: "running" | "ok" | "error"
  result?: unknown
}
type RenderItem = RenderText | RenderTool

export default function ChatMessage({
  message,
  pendingChanges,
  onAcceptChange,
  onRejectChange,
}: {
  message: Record<string, unknown>
  pendingChanges?: Map<string, PendingChange>
  onAcceptChange?: (toolCallId: string) => void
  onRejectChange?: (toolCallId: string) => void
}) {
  const isUser = message.role === "user"

  const streamingContent = (message.streamingContent as string) || ""
  const finalContent = (message.content as string) || ""
  const eventLog = Array.isArray(message.eventLog) ? (message.eventLog as RawEvent[]) : []
  const showThinking = !!message.streaming && !!message.awaitingFirstResponse

  const renderItems = useMemo((): RenderItem[] => {
    const resultMap = new Map<
      string,
      { result: unknown; tagName?: string; toolName?: string; attrs?: Record<string, unknown> }
    >()
    const blockInfoMap = new Map<
      string,
      { tagName?: string; toolName?: string; attrs?: Record<string, unknown> }
    >()

    for (const ev of eventLog) {
      if (ev.type === "result") {
        resultMap.set(ev.toolCallId, {
          result: ev.result,
          tagName: ev.tag_name,
          toolName: ev.tool_name,
          attrs: ev.attributes,
        })
      }
      if (ev.type === "block_start") {
        blockInfoMap.set(ev.toolCallId, {
          tagName: ev.tag_name,
          toolName: ev.tool_name,
          attrs: ev.attributes,
        })
      }
    }

    const items: RenderItem[] = []
    const seenTools = new Set<string>()
    let textBuf = ""
    let textKey = ""

    const flushText = () => {
      if (textBuf.trim()) {
        items.push({ kind: "text", content: textBuf, key: textKey })
      }
      textBuf = ""
      textKey = ""
    }

    eventLog.forEach((ev, idx) => {
      if (ev.type === "text") {
        if (!textKey) textKey = `text-${idx}`
        textBuf += ev.content
        return
      }

      if (ev.type === "block_start" && !seenTools.has(ev.toolCallId)) {
        flushText()
        seenTools.add(ev.toolCallId)

        const res = resultMap.get(ev.toolCallId)
        const info = blockInfoMap.get(ev.toolCallId)
        const name = ev.tool_name || ev.tag_name || info?.toolName || info?.tagName || "tool"
        const args = (ev.attributes || info?.attrs) as Record<string, unknown> | undefined

        let status: "running" | "ok" | "error" = "running"
        let result: unknown = undefined

        if (res) {
          const r = (res.result ?? {}) as Record<string, unknown>
          const isErr = typeof r?.error === "string" || r?.success === false
          status = isErr ? "error" : "ok"
          result = res.result
        }

        items.push({
          kind: "tool",
          key: `tool-${ev.toolCallId}`,
          toolCallId: ev.toolCallId,
          name,
          args,
          status,
          result,
        })
        return
      }

      if (
        ev.type === "block_update" ||
        ev.type === "loading" ||
        ev.type === "result" ||
        ev.type === "plan"
      ) {
        return
      }
    })

    flushText()
    return items
  }, [eventLog])

  const showEventLog = renderItems.length > 0
  const showFinalText =
    !message.streaming && finalContent.trim().length > 0 && !showEventLog

  return (
    <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"} nc-fade-in`}>
      <div
        className={`flex gap-2.5 sm:gap-3 max-w-full ${
          isUser ? "flex-row-reverse max-w-[85%] sm:max-w-[75%]" : "flex-row max-w-full sm:max-w-[88%]"
        }`}
      >
        <div
          className={`shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-2xl flex items-center justify-center border ${
            isUser
              ? "bg-[color:var(--accent)] text-white border-transparent"
              : "bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] text-white border-transparent"
          }`}
          aria-hidden="true"
        >
          {isUser ? <User size={15} /> : <Sparkles size={15} />}
        </div>

        <div
          className={`min-w-0 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed border ${
            isUser
              ? "bg-[color:var(--accent)] text-white border-transparent shadow-[0_8px_30px_rgba(124,92,255,0.25)]"
              : "bg-[color:var(--surface)] text-[color:var(--foreground)] border-[color:var(--border)] shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{String(message.content ?? "")}</div>
          ) : (
            <>
              {showThinking && (
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1 text-[11px] text-[color:var(--muted-foreground)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] nc-pulse-dot" />
                  Thinking…
                </div>
              )}

              {showEventLog ? (
                <div className="space-y-2">
                  {renderItems.map((item) => {
                    if (item.kind === "text") {
                      const trimmed = item.content.trim()
                      if (!trimmed) return null
                      return (
                        <div
                          key={item.key}
                          className="text-[color:var(--foreground)] text-sm leading-relaxed nc-prose"
                        >
                          <MarkdownRenderer content={trimmed} />
                        </div>
                      )
                    }

                    if (item.kind === "tool") {
                      const isFileEditTool = FILE_EDIT_TOOLS.has(item.name)
                      const pendingEntry = pendingChanges?.get(item.toolCallId)

                      if (isFileEditTool && pendingEntry && item.status !== "running") {
                        return (
                          <CodeDiffCard
                            key={item.key}
                            toolCallId={item.toolCallId}
                            name={item.name}
                            path={pendingEntry.path}
                            originalContent={pendingEntry.originalContent}
                            modifiedContent={pendingEntry.modifiedContent}
                            diffStatus={pendingEntry.diffStatus}
                            onAccept={() => onAcceptChange?.(item.toolCallId)}
                            onReject={() => onRejectChange?.(item.toolCallId)}
                          />
                        )
                      }

                      if (item.status === "running") {
                        return (
                          <ToolStreamingCard
                            key={item.key}
                            tagName={item.name}
                            attributes={item.args}
                          />
                        )
                      }
                      return (
                        <ToolResultCard
                          key={item.key}
                          name={item.name}
                          args={item.args}
                          result={item.result}
                          status={item.status}
                        />
                      )
                    }

                    return null
                  })}

                </div>
              ) : showFinalText ? (
                <div className="nc-prose">
                  <MarkdownRenderer content={finalContent} />
                </div>
              ) : message.streaming && !showThinking && streamingContent.trim() ? (
                <div className="text-[color:var(--foreground)] whitespace-pre-wrap">
                  {streamingContent}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
