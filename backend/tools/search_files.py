import os
import re
from pathlib import Path
from workspace import get_workspace

# Directories to skip (case-insensitive)
SKIP_DIRS = {
    '.git', '.vscode', '.idea', 'node_modules', '__pycache__', '.pytest_cache',
    '.tox', 'venv', '.env', 'env', 'build', 'dist', '.next', '.nuxt', 'coverage',
    '.nyc_output', 'dist-electron', '.cache', 'tmp', 'temp'
}

# Binary file extensions to skip
BINARY_EXTENSIONS = {
    '.pyc', '.pyo', '.so', '.dll', '.exe', '.bin', '.o', '.a', '.lib',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.svg', '.pdf',
    '.zip', '.tar', '.gz', '.rar', '.7z', '.exe', '.dmg',
    '.mp3', '.mp4', '.wav', '.mov', '.avi', '.mkv', '.iso'
}

# Maximum file size to search (5MB)
MAX_FILE_SIZE = 5 * 1024 * 1024

# Maximum lines per file to search
MAX_LINES_PER_FILE = 10000

def _should_skip_dir(dir_name: str) -> bool:
    """Check if directory should be skipped."""
    return dir_name.lower() in SKIP_DIRS or dir_name.startswith('.')

def _should_skip_file(file_path: str) -> bool:
    """Check if file should be skipped based on extension or size."""
    # Check extension
    if Path(file_path).suffix.lower() in BINARY_EXTENSIONS:
        return True
    
    # Check file size
    try:
        if os.path.getsize(file_path) > MAX_FILE_SIZE:
            return True
    except OSError:
        return True
    
    return False

def _is_binary_file(file_path: str) -> bool:
    """Quick check if file is binary."""
    try:
        with open(file_path, 'rb') as f:
            chunk = f.read(8192)
            return b'\x00' in chunk
    except Exception:
        return True

async def search_files(query: str, max_results: int = 100, use_regex: bool = False):
    """
    Optimized file search with improved performance and resource usage.
    
    Args:
        query: Search query (plain text or regex pattern)
        max_results: Maximum results to return (default 100)
        use_regex: If True, treat query as regex pattern; else plain text
    
    Returns:
        Dictionary with matches list and metadata
    """
    workspace = get_workspace()
    if not workspace:
        raise ValueError("Workspace not set")
    
    if not query or not query.strip():
        raise ValueError("Search query cannot be empty")
    
    matches = []
    files_searched = 0
    files_skipped = 0
    
    try:
        # Compile pattern
        if use_regex:
            try:
                pattern = re.compile(query, re.IGNORECASE | re.MULTILINE)
            except re.error as e:
                raise ValueError(f"Invalid regex pattern: {str(e)}")
        else:
            pattern = re.compile(re.escape(query), re.IGNORECASE)
        
        # Walk through workspace
        for root, dirs, filenames in os.walk(workspace):
            # Skip unwanted directories (in-place modification)
            dirs[:] = [d for d in dirs if not _should_skip_dir(d)]
            
            for filename in filenames:
                # Early exit if max results reached
                if len(matches) >= max_results:
                    return {
                        "matches": matches[:max_results],
                        "metadata": {
                            "total_matches": len(matches),
                            "files_searched": files_searched,
                            "files_skipped": files_skipped,
                            "truncated": True,
                            "query": query,
                            "query_type": "regex" if use_regex else "plaintext"
                        }
                    }
                
                full_path = os.path.join(root, filename)
                
                # Skip files based on extension/size
                if _should_skip_file(full_path):
                    files_skipped += 1
                    continue
                
                # Skip binary files
                if _is_binary_file(full_path):
                    files_skipped += 1
                    continue
                
                # Search file
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        rel_path = os.path.relpath(full_path, workspace)
                        lines_read = 0
                        
                        for line_number, line in enumerate(f, start=1):
                            # Limit lines per file to prevent resource exhaustion
                            if lines_read >= MAX_LINES_PER_FILE:
                                break
                            
                            lines_read += 1
                            
                            if pattern.search(line):
                                # Get context (surrounding lines for better UX)
                                matches.append({
                                    "path": rel_path,
                                    "line": line_number,
                                    "text": line.rstrip(),
                                    "match_type": "regex" if use_regex else "plaintext"
                                })
                                
                                # Break if max results reached within file
                                if len(matches) >= max_results:
                                    break
                        
                        files_searched += 1
                
                except Exception as e:
                    # Log but don't fail on individual files
                    files_skipped += 1
                    continue
    
    except ValueError as e:
        raise e
    except Exception as e:
        raise ValueError(f"Search error: {str(e)}")
    
    return {
        "matches": matches[:max_results],
        "metadata": {
            "total_matches": len(matches),
            "files_searched": files_searched,
            "files_skipped": files_skipped,
            "truncated": len(matches) >= max_results,
            "query": query,
            "query_type": "regex" if use_regex else "plaintext"
        }
    }
