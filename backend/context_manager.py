"""
Smart context manager for the NeuralCode agent.

Provides file indexing and relevance-based retrieval so the agent can
efficiently load only the files that matter for the current task, even
in very large projects.
"""

import os
import re
from typing import Dict, List, Optional, Tuple

from workspace import get_workspace, read_file as _read_file

# Extensions worth indexing (skip binaries, lock files, dist output)
_SKIP_EXTENSIONS = {
    ".pyc", ".pyo", ".pyd", ".so", ".dll", ".exe", ".bin",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".mp3", ".mp4", ".wav", ".ogg",
    ".zip", ".tar", ".gz", ".7z", ".rar",
    ".lock", ".log",
}
_SKIP_DIRS = {
    "__pycache__", ".git", "node_modules", "dist", "build",
    ".cache", ".pytest_cache", "dist-electron", ".pythonlibs",
}
_MAX_FILE_SIZE_BYTES = 200_000  # skip files > 200 KB
_PREVIEW_CHARS = 600            # chars loaded for index preview


class FileIndex:
    """Lightweight in-memory file index for a workspace."""

    def __init__(self):
        self._index: Dict[str, Dict] = {}

    def build(self, workspace: str) -> int:
        """Walk the workspace and build the index. Returns file count."""
        self._index = {}
        for root, dirs, files in os.walk(workspace):
            dirs[:] = [d for d in dirs if d not in _SKIP_DIRS and not d.startswith(".")]
            for fname in files:
                ext = os.path.splitext(fname)[1].lower()
                if ext in _SKIP_EXTENSIONS:
                    continue
                full = os.path.join(root, fname)
                rel = os.path.relpath(full, workspace)
                try:
                    size = os.path.getsize(full)
                    if size > _MAX_FILE_SIZE_BYTES:
                        continue
                    with open(full, "r", encoding="utf-8", errors="ignore") as f:
                        preview = f.read(_PREVIEW_CHARS)
                    self._index[rel] = {
                        "path": rel,
                        "size": size,
                        "ext": ext,
                        "preview": preview,
                        "keywords": _extract_keywords(preview + " " + rel),
                    }
                except Exception:
                    continue
        return len(self._index)

    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        """Return the top_k most relevant files for the given query."""
        if not self._index:
            return []
        query_kw = _extract_keywords(query)
        if not query_kw:
            return list(self._index.values())[:top_k]

        scored: List[Tuple[float, Dict]] = []
        for meta in self._index.values():
            score = _score(query_kw, meta)
            if score > 0:
                scored.append((score, meta))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in scored[:top_k]]

    def all_paths(self) -> List[str]:
        return list(self._index.keys())

    def size(self) -> int:
        return len(self._index)


def _extract_keywords(text: str) -> List[str]:
    """Extract meaningful lowercase words from text."""
    words = re.findall(r"[a-zA-Z_][a-zA-Z0-9_]{2,}", text)
    stop = {
        "the", "and", "for", "are", "that", "this", "with", "from",
        "have", "has", "not", "was", "but", "can", "will", "all",
        "def", "class", "return", "import", "from", "pass", "self",
    }
    return [w.lower() for w in words if w.lower() not in stop]


def _score(query_kw: List[str], meta: Dict) -> float:
    """Score a file entry against query keywords."""
    file_kw = set(meta.get("keywords", []))
    path_lower = meta["path"].lower()
    score = 0.0
    for kw in query_kw:
        if kw in file_kw:
            score += 1.0
        if kw in path_lower:
            score += 2.0
    return score


# ---- Singleton index ----
_index = FileIndex()


def rebuild_index() -> int:
    """Rebuild the index for the current workspace. Returns file count."""
    workspace = get_workspace()
    if not workspace:
        return 0
    return _index.build(workspace)


def get_relevant_files(task: str, top_k: int = 8) -> List[Dict]:
    """Return the most relevant file metadata entries for a task description."""
    if _index.size() == 0:
        rebuild_index()
    return _index.search(task, top_k=top_k)


def build_context_block(task: str, top_k: int = 6) -> str:
    """
    Build a compact context block describing the most relevant files.
    This is injected into the system prompt for the current task.
    """
    relevant = get_relevant_files(task, top_k=top_k)
    if not relevant:
        return ""

    lines = ["## Relevant files (auto-loaded context)"]
    for meta in relevant:
        path = meta["path"]
        size = meta["size"]
        preview = meta["preview"].strip()[:200].replace("\n", " ")
        lines.append(f"- `{path}` ({size} bytes): {preview}")
    return "\n".join(lines)


def get_file_tree_summary(max_files: int = 80) -> str:
    """Return a compact file tree string for the workspace."""
    if _index.size() == 0:
        rebuild_index()
    paths = _index.all_paths()
    if not paths:
        return "(workspace is empty or not set)"
    paths = sorted(paths)[:max_files]
    suffix = f"\n  ... and {_index.size() - max_files} more files" if _index.size() > max_files else ""
    return "\n  ".join(paths) + suffix
