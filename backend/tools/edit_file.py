from workspace import read_file as _read_file, write_file as _write_file

async def edit_file(path: str, search: str, replace: str):
    """
    Edit specific lines in a file with minimal overhead.
    Only returns the affected lines (before and after) with context,
    not the entire file content.
    """
    try:
        content = _read_file(path)
    except Exception as e:
        return {"success": False, "error": f"Cannot read file: {str(e)}", "path": path}
    
    if search not in content:
        # Extract first few lines for debugging
        lines = content.split('\n')[:5]
        snippet = '\n'.join(lines)
        return {
            "success": False,
            "error": "Search text not found",
            "path": path,
            "hint": f"File starts with:\n{snippet}"
        }

    # Find the exact location of the search text
    search_start = content.find(search)
    search_end = search_start + len(search)
    
    # Extract lines around the change for context (3 lines before and after)
    lines_before_search = content[:search_start].split('\n')
    lines_after_search = content[search_end:].split('\n')
    
    # Get context lines
    context_before = max(0, len(lines_before_search) - 3)
    context_start_line = context_before + 1
    start_lines = lines_before_search[context_before:]
    
    context_end_in_after = min(3, len(lines_after_search))
    end_lines = lines_after_search[:context_end_in_after]
    
    # Build original snippet with context
    original_snippet_lines = start_lines + [search] + end_lines
    original_snippet = '\n'.join(original_snippet_lines)
    
    # Perform replacement (only once if multiple matches)
    count = content.count(search)
    if count > 1:
        return {
            "success": False,
            "error": f"Search text found {count} times — provide more context to make it unique.",
            "path": path,
            "hint": "Use patch_file for multiple occurrences"
        }
    
    updated = content.replace(search, replace, 1)
    
    # Extract modified snippet
    modified_start = content[:search_start].find('\n', -len(search) * 2)
    if modified_start == -1:
        modified_start = 0
    
    modified_lines_before = updated[:search_start].split('\n')
    modified_lines_after = updated[search_start + len(replace):].split('\n')
    
    context_start_mod = max(0, len(modified_lines_before) - 3)
    start_lines_mod = modified_lines_before[context_start_mod:]
    
    context_end_mod = min(3, len(modified_lines_after))
    end_lines_mod = modified_lines_after[:context_end_mod]
    
    modified_snippet_lines = start_lines_mod + end_lines_mod
    modified_snippet = '\n'.join(modified_snippet_lines)
    
    # Write the file
    try:
        _write_file(path, updated)
    except Exception as e:
        return {"success": False, "error": f"Cannot write file: {str(e)}", "path": path}
    
    # Calculate statistics
    lines_changed = abs(replace.count('\n') - search.count('\n'))
    chars_added = len(replace) - len(search)
    
    return {
        "success": True,
        "path": path,
        "operation": "edit",
        "lines_changed": lines_changed,
        "chars_changed": chars_added,
        "before": {
            "snippet": original_snippet,
            "start_line": context_start_line
        },
        "after": {
            "snippet": modified_snippet,
            "start_line": context_start_line
        }
    }
