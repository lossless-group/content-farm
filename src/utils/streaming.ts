import { Editor } from 'obsidian';

export interface StreamToEditorOptions {
    response: Response;
    editor: Editor;
    insertPos?: { line: number; ch: number };
    updateThreshold?: number;
}

export async function streamToEditor({
    response,
    editor,
    insertPos,
    updateThreshold = 50 // ms between updates
}: StreamToEditorOptions): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    let result = '';
    let lastUpdate = Date.now();
    const cursor = editor.getCursor();
    const insertPosition = insertPos || { line: cursor.line + 1, ch: 0 };
    
    // Add a new line for the response if no specific position is provided
    if (!insertPos) {
        editor.replaceRange('\n', cursor);
    }

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            result += chunk;
            
            // Only update the editor at a throttled rate for performance
            const now = Date.now();
            if (now - lastUpdate >= updateThreshold) {
                editor.replaceRange(chunk, insertPosition);
                lastUpdate = now;
            }
            
            // Move cursor to end of inserted text
            const lines = result.split('\n');
            const lastLine = lines[lines.length - 1] || '';
            editor.setCursor({
                line: insertPosition.line + Math.max(0, lines.length - 1),
                ch: lastLine.length
            });
        }
        
        // Final update with any remaining content
        editor.replaceRange(result, insertPosition);
        return result;
    } catch (error) {
        console.error('Error streaming response:', error);
        throw error;
    }
}
