export function extractSemantics(astRoot, sourceText) {
  const chunks = [];
  const queue = [astRoot];

  // While BFS is utilized here to guarantee we won't hit call stack limits on deeply nested ASTs,
  // Tree-sitter's native Query API (using S-expressions like `(function_declaration) @func`)
  // or a Depth-First Search (DFS) could be employed later.
  // Queries are often more concise for complex pattern matching,
  // while DFS might preserve natural document ordering without extra sorting.

  while (queue.length > 0) {
    const node = queue.shift();

    let isTargetNode = false;

    if (
      node.type === 'class_declaration' ||
      node.type === 'function_declaration' ||
      node.type === 'method_definition'
    ) {
      isTargetNode = true;
    } else if (node.type === 'lexical_declaration') {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child.type === 'variable_declarator') {
          for (let j = 0; j < child.childCount; j++) {
            if (child.child(j).type === 'arrow_function') {
              isTargetNode = true;
              break;
            }
          }
        }
        if (isTargetNode) break;
      }
    }

    if (isTargetNode) {
      chunks.push({
        type: node.type,
        text: node.text,
        startLine: node.startPosition.row,
        endLine: node.endPosition.row
      });
    }

    for (let i = 0; i < node.childCount; i++) {
      queue.push(node.child(i));
    }
  }

  return chunks;
}
