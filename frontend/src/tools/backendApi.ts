const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"

export async function callWorkspaceApi(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Backend error ${res.status}: ${errorText}`)
  }

  return (await res.json()) as unknown
}
