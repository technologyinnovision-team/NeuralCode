"""
Smart context manager for the NeuralCode agent.

Provides file indexing and relevance-based retrieval so the agent can
efficiently load only the files that matter for the current task, even
in very large projects.
"""

import os
import re
from typing import Dict, List, Tuple

from workspace import get_workspace, read_file as _read_file

# Extensions worth indexing (skip binaries, lock files, dist output)
_SKIP_EXTENSIONS = {
    ".pyc", ".pyo", ".pyd", ".so", ".dll", ".exe", ".bin",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".mp3", ".mp4", ".wav", ".ogg",
    ".zip", ".tar", ".gz", ".7z", ".rar",
    ".lock", ".log", ".map",
}

_SKIP_DIRS = {
    "__pycache__", ".git", "node_modules", "dist", "build",
    ".cache", ".pytest_cache", "dist-electron", ".pythonlibs",
    ".venv", "venv", ".env", "coverage", ".nyc_output",
}

# Known large/low-value files to never index regardless of extension
_SKIP_FILENAMES = {
    # JS/TS lockfiles (can be 100k+ chars)
    "package-lock.json",
    "package-shrinkwrap.json",
    "pnpm-lock.yaml",
    "bun.lockb",
    "yarn.lock",
    # Other language lockfiles
    "composer.lock",
    "Gemfile.lock",
    "Cargo.lock",
    "poetry.lock",
    "go.sum",
    "Pipfile.lock",
    # Boilerplate / meta files
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    ".prettierignore",
    ".eslintignore",
    ".npmignore",
    ".dockerignore",
    "LICENSE",
    "LICENCE",
    "CHANGELOG",
    "CHANGELOG.md",
    "CHANGELOG.txt",
}

# Extensions that indicate source code — get a scoring boost
_SOURCE_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".rs", ".go", ".java", ".cpp", ".c", ".h",
    ".cs", ".rb", ".php", ".swift", ".kt", ".vue",
    ".svelte", ".html", ".css", ".scss", ".sass", ".less",
    ".sh", ".bash", ".zsh",
}

_MAX_FILE_SIZE_BYTES = 80_000   # skip files > 80 KB during indexing
_PREVIEW_CHARS       = 600      # chars loaded for index keyword extraction
_MIN_SCORE           = 1.0      # files scoring below this are excluded from results


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
                # Skip by exact filename first (fastest check)
                if fname in _SKIP_FILENAMES:
                    continue
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
                        "path":     rel,
                        "size":     size,
                        "ext":      ext,
                        "preview":  preview,
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
        # No usable keywords → don't spray random files into context
        if not query_kw:
            return []

        scored: List[Tuple[float, Dict]] = []
        for meta in self._index.values():
            score = _score(query_kw, meta)
            if score >= _MIN_SCORE:
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
        "def", "class", "return", "import", "pass", "self",
        "null", "true", "false", "let", "var", "const",
    }
    return [w.lower() for w in words if w.lower() not in stop]


def _score(query_kw: List[str], meta: Dict) -> float:
    """Score a file entry against query keywords, with size and type weighting."""
    file_kw  = set(meta.get("keywords", []))
    path_low = meta["path"].lower()
    ext      = meta.get("ext", "")
    size     = meta.get("size", 0)
    score    = 0.0

    for kw in query_kw:
        if kw in file_kw:
            score += 1.0
        if kw in path_low:
            score += 2.0   # path match is a strong signal

    # Boost actual source/markup files
    if ext in _SOURCE_EXTENSIONS:
        score *= 1.4

    # Penalise large files — they eat context budget without proportional value
    size_kb = size / 1000.0
    if size_kb > 15:
        penalty = min(0.9, (size_kb - 15) / 100.0)
        score  *= max(0.1, 1.0 - penalty)

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


def build_context_block(task: str, top_k: int = 8) -> str:
    """
    Build a compact context block describing the most relevant files.
    This is injected into the system prompt for the current task.
    """
    relevant = get_relevant_files(task, top_k=top_k)
    if not relevant:
        return ""

    lines = ["## Relevant files (auto-loaded context)"]
    for meta in relevant:
        path    = meta["path"]
        size    = meta["size"]
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
