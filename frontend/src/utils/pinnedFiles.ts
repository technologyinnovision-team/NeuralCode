const KEY = "nc_pinned_files"

export function getPinnedFiles(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as string[] }
  catch { return [] }
}

export function setPinnedFiles(paths: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(paths))
}

export function togglePin(path: string): string[] {
  const current = getPinnedFiles()
  const next = current.includes(path)
    ? current.filter((p) => p !== path)
    : [...current, path]
  setPinnedFiles(next)
  return next
}

export function isFilePinned(path: string): boolean {
  return getPinnedFiles().includes(path)
}
