from workspace import read_file as _read_file, write_file as _write_file

async def patch_file(path: str, search: str, replace: str):
    """
    Patch a file by replacing search text with replacement text.
    Optimized to handle only specific lines with minimal output.
    
    Returns only affected lines (before and after) with context,
    not the entire file content.
    """
    try:
        original = _read_file(path)
    except Exception as e:
        return {"success": False, "error": f"Cannot read file: {str(e)}", "path": path}

    if search not in original:
        # Extract first few lines for debugging
        lines = original.split('\n')[:5]
        snippet = '\n'.join(lines)
        return {
            "success": False,
            "error": "Search text not found in file.",
            "path": path,
            "hint": f"File starts with:\n{snippet}",
        }

    count = original.count(search)
    if count > 1:
        return {
            "success": False,
            "error": f"Search text found {count} times — provide more context to make it unique.",
            "path": path,
            "hint": "Add more context to the search string to make it unique"
        }

    # Find location of search text
    search_start = original.find(search)
    search_end = search_start + len(search)
    
    # Extract context before change
    lines_before = original[:search_start].split('\n')
    context_start = max(0, len(lines_before) - 3)
    context_lines = lines_before[context_start:]
    
    # Extract context after change
    lines_after = original[search_end:].split('\n')
    context_after = min(3, len(lines_after))
    context_after_lines = lines_after[:context_after]
    
    # Build original snippet
    original_snippet = '\n'.join(context_lines + [search] + context_after_lines)
    start_line_num = context_start + 1
    
    # Perform replacement
    updated = original.replace(search, replace, 1)
    
    # Extract context for modified snippet
    modified_before = updated[:search_start].split('\n')
    modified_context_start = max(0, len(modified_before) - 3)
    modified_context_lines = modified_before[modified_context_start:]
    
    modified_after = updated[search_start + len(replace):].split('\n')
    modified_context_after = min(3, len(modified_after))
    modified_after_lines = modified_after[:modified_context_after]
    
    # Build modified snippet
    modified_snippet = '\n'.join(modified_context_lines + modified_after_lines)
    
    # Write file
    try:
        _write_file(path, updated)
    except Exception as e:
        return {"success": False, "error": f"Cannot write file: {str(e)}", "path": path}

    # Calculate statistics
    lines_changed = abs(replace.count('\n') - search.count('\n'))
    chars_changed = len(replace) - len(search)
    
    return {
        "success": True,
        "path": path,
        "operation": "patch",
        "lines_changed": lines_changed,
        "chars_changed": chars_changed,
        "before": {
            "snippet": original_snippet,
            "start_line": start_line_num
        },
        "after": {
            "snippet": modified_snippet,
            "start_line": start_line_num
        }
    }
