import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as crypto from 'crypto';

interface ContentFarmSettings {
    mySetting: string;
    localLLMPath: string;
    requestBodyTemplate: string;
}

const DEFAULT_SETTINGS: ContentFarmSettings = {
    mySetting: 'default',
    // Use host.docker.internal to connect to the host machine from Docker containers
    localLLMPath: 'http://host.docker.internal:3030/api/search',
    requestBodyTemplate: `{
  "chatModel": {
    "provider": "ollama",
    "name": "llama3.2:latest"
  },
  "embeddingModel": {
    "provider": "ollama",
    "name": "llama3.2:latest"
  },
  "optimizationMode": "speed",
  "focusMode": "webSearch",
  "query": "What is Perplexica's architecture?",
  "history": [
    {
      "role": "user",
      "content": "What is Perplexica's architecture?"
    }
  ],
  "systemInstructions": "You are a helpful AI assistant. Provide clear, concise, and accurate information.",
  "stream": false,
  "maxTokens": 2048,
  "temperature": 0.7
}`
};

export default class ContentFarmPlugin extends Plugin {
    public settings: ContentFarmSettings = DEFAULT_SETTINGS;
    private statusBarItemEl: HTMLElement | null = null;
    private ribbonIconEl: HTMLElement | null = null;

    async onload(): Promise<void> {
        await this.loadSettings();

        // Debug: Log current settings
        console.log('Current LLM Path:', this.settings.localLLMPath);
        console.log('Full settings:', JSON.stringify(this.settings, null, 2));

        this.registerRibbonIcon();
        this.setupStatusBar();
        this.registerCommands();
        this.addSettingTab(new ContentFarmSettingTab(this.app, this));
        this.registerCitationCommands();

        // Add command to update LLM URL
        this.addCommand({
            id: 'update-llm-url',
            name: 'Update LLM URL',
            callback: () => {
                // Create a modal to get the new URL
                const modal = new (class extends Modal {
                    private urlInput!: HTMLInputElement; // Using definite assignment assertion
                    
                    constructor(app: App, private plugin: ContentFarmPlugin) {
                        super(app);
                    }
                    
                    onOpen() {
                        const {contentEl} = this;
                        contentEl.createEl('h2', {text: 'Update LLM API URL'});
                        
                        const form = contentEl.createEl('form');
                        const div = form.createDiv({cls: 'setting-item'});
                        
                        div.createEl('label', {
                            text: 'LLM API URL',
                            attr: {for: 'llm-url-input'}
                        });
                        
                        this.urlInput = div.createEl('input', {
                            type: 'text',
                            value: this.plugin.settings.localLLMPath,
                            cls: 'text-input',
                            attr: {id: 'llm-url-input'}
                        });
                        
                        const buttonDiv = contentEl.createDiv({cls: 'setting-item'});
                        const saveButton = buttonDiv.createEl('button', {
                            text: 'Save',
                            cls: 'mod-cta'
                        });
                        
                        form.onsubmit = (e) => {
                            e.preventDefault();
                            this.onSubmit();
                        };
                        
                        saveButton.onclick = () => this.onSubmit();
                    }
                    
                    onSubmit() {
                        const newUrl = this.urlInput.value.trim();
                        if (newUrl) {
                            this.plugin.settings.localLLMPath = newUrl;
                            this.plugin.saveSettings();
                            new Notice(`LLM URL updated to: ${newUrl}`);
                            this.close();
                        }
                    }
                    
                    onClose() {
                        const {contentEl} = this;
                        contentEl.empty();
                    }
                })(this.app, this);
                
                modal.open();
            }
        });
        
        // Add command to show current settings
        this.addCommand({
            id: 'show-llm-settings',
            name: 'Show LLM Settings',
            callback: () => {
                new Notice(`Current LLM URL: ${this.settings.localLLMPath}`);
                console.log('LLM Settings:', this.settings);
            }
        });
    }

    onunload(): void {
        this.statusBarItemEl?.remove();
        this.ribbonIconEl?.remove();
    }

    /**
     * Register citation-related commands
     */
    private registerCitationCommands(): void {
        console.log('Registering citation commands...');
        
        this.addCommand({
            id: 'convert-all-citations',
            name: 'Convert All Citations to Hex Format',
            editorCallback: async (editor: Editor) => {
                console.log('convert-all-citations command triggered');
                try {
                    const content = editor.getValue();
                    console.log('Processing content length:', content.length);
                    const result = this.processCitations(content);
                    
                    if (result.changed) {
                        console.log('Citations changed, updating editor');
                        editor.setValue(result.updatedContent);
                        new Notice(`Updated ${result.stats.citationsConverted} citations`);
                    } else {
                        console.log('No citations needed conversion');
                        new Notice('No citations needed conversion');
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error('Error in convert-all-citations:', error);
                    new Notice('Error processing citations: ' + errorMsg);
                }
            }
        });
        
        console.log('Citation commands registered');
    }

    /**
     * Process citations in the content
     * @param content - The markdown content to process
     * @returns Object with updated content and statistics
     */
    private processCitations(content: string): {
        updatedContent: string;
        changed: boolean;
        stats: {
            citationsConverted: number;
        };
    } {
        // Extract code blocks to avoid processing them
        const codeBlocks: { placeholder: string; original: string }[] = [];
        let processableContent = content;
        
        // Extract fenced code blocks
        processableContent = processableContent.replace(/```[\s\S]*?```/g, (match) => {
            const placeholder = `__CODE_BLOCK_${crypto.randomBytes(4).toString('hex')}__`;
            codeBlocks.push({ placeholder, original: match });
            return placeholder;
        });

        // Process citations
        const result = this.convertCitations(processableContent);
        
        // Restore code blocks
        for (const { placeholder, original } of codeBlocks) {
            result.updatedContent = result.updatedContent.replace(placeholder, original);
        }

        return result;
    }

    /**
     * Generate a random hex string of specified length
     * @param length - Length of the hex string to generate
     * @returns Random hex string
     */
    private generateHexId(length: number = 6): string {
        return crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    }

    /**
     * Convert all citations to random hex format
     * @param content - The markdown content to process
     * @returns Object with updated content and statistics
     */
    private convertCitations(content: string): {
        updatedContent: string;
        changed: boolean;
        stats: {
            citationsConverted: number;
        };
    } {
        let updatedContent = content;
        let citationsConverted = 0;
        const citationMap = new Map<string, string>(); // Maps original ID to hex ID
        
        // First pass: collect all citations and generate hex IDs
        const collectCitations = (_match: string, _prefix: string, id: string) => {
            if (!citationMap.has(id)) {
                citationMap.set(id, this.generateHexId());
            }
            return match; // Don't modify yet
        };
        
        // Collect numeric citations [^123]
        updatedContent = updatedContent.replace(/\[\^(\d+)\]/g, collectCitations);
        
        // Collect plain numeric citations [123] (only if not part of a link)
        updatedContent = updatedContent.replace(/\[(\d+)\]/g, (match, id, offset) => {
            // Only collect if it's not part of a link
            if (!/\]\([^)]*$/.test(updatedContent.substring(0, offset))) {
                return collectCitations(match, '', id);
            }
            return match;
        });
        
        if (citationMap.size === 0) {
            return { updatedContent, changed: false, stats: { citationsConverted: 0 } };
        }
        
        // Second pass: replace all collected citations with their hex IDs
        citationMap.forEach((hexId, originalId) => {
            // Replace inline citations [^123] or [123]
            updatedContent = updatedContent.replace(
                new RegExp(`\\[\\^?${originalId}\\]`, 'g'),
                ` [^${hexId}]`
            );
            
            // Replace footnote definitions [^123]: or [^hex]:
            updatedContent = updatedContent.replace(
                new RegExp(`\\[\\^${originalId}\\](:\\s*)`, 'g'),
                `[^${hexId}]$1`
            );
            
            citationsConverted++;
        });
        
        // Ensure consistent formatting of all footnote definitions
        updatedContent = updatedContent.replace(/\[\^([0-9a-f]{6})\]:\s*/gi, (match, hexId) => {
            return `[^${hexId.toLowerCase()}]: `; // Ensure consistent case
        });
        
        return {
            updatedContent,
            changed: citationsConverted > 0,
            stats: { citationsConverted }
        };
    }

    private async loadSettings(): Promise<void> {
        this.settings = { 
            ...DEFAULT_SETTINGS, 
            ...(await this.loadData() ?? {}) 
        };
    }

    public async saveSettings(): Promise<void> {
        try {
            await this.saveData(this.settings);
        } catch (error) {
            console.error('Failed to save settings:', error);
            new Notice('Failed to save settings');
        }
    }

    private async testConnectivity(url: string): Promise<{success: boolean; error?: string; details?: any}> {
        try {
            // Try a simple fetch to check connectivity
            const response = await fetch(url, {
                method: 'OPTIONS', // Use OPTIONS to avoid CORS preflight issues
                mode: 'no-cors',
                cache: 'no-store'
            });
            
            // If we get here, the request went through (even with CORS issues)
            return { 
                success: true,
                details: {
                    status: response.status,
                    statusText: response.statusText,
                    // Convert headers to a plain object
                    headers: (() => {
                        const headers: Record<string, string> = {};
                        // @ts-ignore - Headers.entries() exists in browser environment
                        for (const [key, value] of response.headers.entries()) {
                            headers[key] = value;
                        }
                        return headers;
                    })()
                }
            };
        } catch (error) {
            const err = error as Error;
            return {
                success: false,
                error: err.message,
                details: {
                    name: err.name,
                    stack: err.stack,
                    isTypeError: err instanceof TypeError,
                    isNetworkError: err.name === 'TypeError' && 
                        (err.message.includes('fetch') || err.message.includes('network'))
                }
            };
        }
    }

    private async sendRequest(jsonString: string, editor?: Editor): Promise<string> {
        if (!editor) {
            throw new Error('No active editor found. Please open a markdown file and try again.');
        }
        
        const timestamp = new Date().toISOString();
        const { localLLMPath } = this.settings;
        
        // Add diagnostic information
        const diagnostics = `## Connection Diagnostics (${timestamp})

### Current Configuration
- **LLM URL**: \`${localLLMPath}\`
- **Time**: ${timestamp}
- **User Agent**: ${navigator.userAgent}

### Testing connection...\n`;
        
        // Add diagnostics to the editor
        const cursorPos = editor.getCursor();
        editor.replaceRange('\n---\n' + diagnostics, cursorPos);
        
        // Test connectivity
        const testResult = await this.testConnectivity(localLLMPath);
        
        // Add test results
        const testResultMarkdown = testResult.success 
            ? '✅ Connection successful!\n\n### Connection Details\n```json\n' + 
              JSON.stringify(testResult.details, null, 2) + '\n```\n'
            : `❌ Connection failed!

### Error Details
\`\`\`json
${JSON.stringify(testResult.details, null, 2)}\n\`\`\`

### Troubleshooting Steps
1. **Check if the server is running**
   - Ensure Perplexica is running in Docker
   - Run \`docker ps\` to check container status

2. **Verify the URL**
   - For Docker on Mac/Windows: \`http://host.docker.internal:3030/api/search\`
   - For Linux: You might need to use \`http://172.17.0.1:3030/api/search\`
   - For local testing: \`http://localhost:3030/api/search\`

3. **Check Docker network**
   - Run \`docker network inspect bridge\`
   - Look for \`Gateway\` IP address

4. **Test from container**
   \`\`\`bash
   # Get container ID
   docker ps
   
   # Test connection from container
   docker exec -it <container_id> curl -v http://host.docker.internal:3030/api/search
   \`\`\`

5. **Update URL**
   Run **Update LLM URL** command from command palette (Ctrl/Cmd+P) to change the URL.
`;

        editor.replaceRange(testResultMarkdown + '\n', editor.getCursor());
        
        if (!testResult.success) {
            throw new Error(`Failed to connect to ${localLLMPath}: ${testResult.error}`);
        }

        // Add a separator before the request
        const requestCursor = editor.getCursor();
        const errorMarker = '```error\n';
        const separator = '\n---\n';
        editor.replaceRange(separator + '\n## LLM Request\n```json\n' + jsonString + '\n```\n', requestCursor);
        
        try {
            console.log('Sending request to:', this.settings.localLLMPath);
            console.log('Request body:', jsonString);
            
            let response: Response;
            try {
                response = await fetch(this.settings.localLLMPath, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: jsonString,
                });
            } catch (error: unknown) {
                const err = error as Error;
                const errorDetails = `## Error Details
- **Type**: Network Error
- **Message**: ${err.message}
- **URL**: ${this.settings.localLLMPath}
- **Time**: ${new Date().toISOString()}

### Stack Trace
\`\`\`
${err.stack || 'No stack trace available'}
\`\`\``;
                
                // Move to end of document to append error
                const endPos = editor.lastLine();
                editor.setCursor(endPos);
                editor.replaceRange('\n' + errorMarker + errorDetails + '\n```\n', editor.getCursor());
                
                console.error('Fetch error details:', {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                    type: typeof err,
                    isTypeError: err instanceof TypeError,
                    isNetworkError: err.name === 'TypeError' && err.message.includes('fetch')
                });
                
                throw new Error(`Network error: ${err.message}`);
            }

            console.log('Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Could not read error response');
                const errorDetails = `## Error Details
- **Status**: ${response.status} ${response.statusText}
- **URL**: ${this.settings.localLLMPath}
- **Time**: ${new Date().toISOString()}

### Response
\`\`\`
${errorText}
\`\`\``;
                
                // Move to end of document to append error
                const endPos = editor.lastLine();
                editor.setCursor(endPos);
                editor.replaceRange('\n' + errorMarker + errorDetails + '\n```\n', editor.getCursor());
                
                console.error('Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }

            // Parse JSON to check if it's a streaming request
            const requestData = JSON.parse(jsonString);
            if (requestData.stream && editor) {
                // Insert a new line and get the position for streaming
                const cursor = editor.getCursor();
                const insertPos = { line: cursor.line + 1, ch: 0 };
                editor.replaceRange('\n', cursor);
                
                // Handle streaming response directly to editor
                const reader = response.body?.getReader();
                if (!reader) throw new Error('No response body');
                
                let result = '';
                let lastUpdate = Date.now();
                const updateThreshold = 50; // ms between updates
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = new TextDecoder().decode(value);
                    result += chunk;
                    
                    // Only update the editor at a throttled rate for performance
                    const now = Date.now();
                    if (now - lastUpdate >= updateThreshold) {
                        editor.replaceRange(chunk, insertPos);
                        lastUpdate = now;
                    } else {
                        // For the last chunk, make sure to update
                        if (done) {
                            editor.replaceRange(chunk, insertPos);
                        }
                    }
                    
                    // Move cursor to end of inserted text
                    const lines = result.split('\n');
                    const lastLine = lines[lines.length - 1] || ''; // Handle empty last line
                    editor.setCursor({
                        line: insertPos.line + Math.max(0, lines.length - 1), // Ensure non-negative line number
                        ch: lastLine.length
                    });
                }
                
                // Final update with any remaining content
                editor.replaceRange(result, insertPos);
                return result;
            } else {
                if (!editor) {
                    new Notice('Error: No active editor');
                    return '';
                }

                // Simple fetch request with the raw JSON string
                try {
                    const response = await fetch(this.settings.localLLMPath, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: jsonString
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.text();
                    editor.replaceRange('\n' + data, editor.getCursor());
                    return data;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    new Notice(`Error: ${errorMessage}`);
                    throw error;
                }
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                const errorDetails = `## Unhandled Error
- **Type**: ${error.name}
- **Message**: ${error.message}
- **Time**: ${new Date().toISOString()}

### Stack Trace
\`\`\`
${error.stack || 'No stack trace available'}
\`\`\``;
                
                // Move to end of document to append error
                const endPos = editor.lastLine();
                editor.setCursor(endPos);
                editor.replaceRange('\n' + errorMarker + errorDetails + '\n```\n', editor.getCursor());
                
                console.error('Error sending request:', {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    type: 'Error'
                });
                
                // Still show a brief notice for immediate feedback
                new Notice(`Error: ${error.message} (see document for details)`);
                
                // Re-throw to maintain the error chain
                throw error;
            } else {
                const errorMessage = String(error);
                const errorDetails = `## Unknown Error Type
- **Time**: ${new Date().toISOString()}

### Error
\`\`\`
${errorMessage}
\`\`\``;
                
                // Move to end of document to append error
                const endPos = editor.lastLine();
                editor.setCursor(endPos);
                editor.replaceRange('\n' + errorMarker + errorDetails + '\n```\n', editor.getCursor());
                
                console.error('Unknown error type:', error);
                new Notice(`Error: ${errorMessage} (see document for details)`);
                
                // Re-throw to maintain the error chain
                throw new Error(errorMessage);
            }
        }
    }

    private registerRibbonIcon(): void {
        this.ribbonIconEl = this.addRibbonIcon(
            'dice', 
            'Content Farm', 
            () => {
                new Notice('This is Deep Lossless notice!');
            }
        );
        this.ribbonIconEl?.addClass('content-farm-ribbon');
    }

    private setupStatusBar(): void {
        this.statusBarItemEl = this.addStatusBarItem();
        if (this.statusBarItemEl) {
            this.statusBarItemEl.setText('Content Farm Active');
        }
    }

    private registerCommands(): void {
        this.addCommand({
            id: 'open-content-farm-modal',
            name: 'Open Content Farm',
            callback: () => {
                new ContentFarmModal(this.app).open();
            }
        });

        this.addCommand({
            id: 'insert-sample-text',
            name: 'Insert Sample Text',
            editorCallback: (editor: Editor) => {
                editor.replaceSelection('Sample text from Content Farm');
            }
        });

        // Command to insert a citation reference and its footnote definition
        this.addCommand({
            id: 'insert-hex-citation',
            name: 'Insert Random Hex Citation Footnote',
            editorCallback: (editor: Editor) => {
                console.log('insert-hex-citation command triggered');
                try {
                    const cursor = editor.getCursor();
                    console.log('Cursor position:', cursor);
                    
                    const citationId = this.generateHexId();
                    console.log('Generated citation ID:', citationId);
                    
                    // Get current line content
                    const lineContent = editor.getLine(cursor.line);
                    console.log('Current line content:', lineContent);
                    
                    // Insert the citation reference at cursor position
                    const insertPosition = { line: cursor.line, ch: cursor.ch };
                    editor.replaceRange(`[^${citationId}]`, insertPosition);
                    
                    // Add a new line for the footnote definition
                    const nextLine = cursor.line + 1;
                    const nextLineContent = editor.getLine(nextLine) || '';
                    
                    // Insert a newline if next line is not empty
                    if (nextLineContent.trim() !== '') {
                        editor.replaceRange('\n', { line: nextLine, ch: 0 });
                    }
                    
                    // Add the footnote definition
                    const footnotePosition = { 
                        line: nextLineContent.trim() === '' ? nextLine : nextLine + 1, 
                        ch: 0 
                    };
                    
                    editor.replaceRange(`[^${citationId}]: `, footnotePosition);
                    
                    // Position cursor at the end of the footnote definition
                    const newCursorPos = {
                        line: footnotePosition.line,
                        ch: `[^${citationId}]: `.length
                    };
                    editor.setCursor(newCursorPos);
                    
                    console.log('Footnote insertion complete');
                } catch (error) {
                    console.error('Error in insert-hex-citation:', error);
                    new Notice('Error inserting citation: ' + (error instanceof Error ? error.message : String(error)));
                }
            }
        });

        this.addCommand({
            id: 'open-sample-modal-complex',
            name: 'Open sample modal (complex)',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        new ContentFarmModal(this.app).open();
                    }
                    return true;
                }
                return false;
            }
        });

        this.addCommand({
            id: 'send-perplexica-request',
            name: 'Send Perplexica Request',
            editorCallback: (editor) => {
                const template = `{
  "chatModel": {
    "provider": "ollama",
    "name": "llama3.2:latest"
  },
  "embeddingModel": {
    "provider": "ollama",
    "name": "llama3.2:latest"
  },
  "optimizationMode": "speed",
  "focusMode": "webSearch",
  "query": "Your query here",
  "history": [
    {
      "role": "user",
      "content": "Your query here"
    }
  ],
  "systemInstructions": "You are a helpful AI assistant. Provide clear, concise, and accurate information.",
  "stream": false,
  "maxTokens": 2048,
  "temperature": 0.7
}`;
                editor.replaceSelection(
                    '```requestjson--perplexica\n' + 
                    template + '\n' +
                    '```'
                );
            }
        });

        // This adds an editor command that can perform some operation on the current editor instanceAdd commentMore actions
        this.addCommand({
            id: 'add-hex-citation',
            name: 'Add Inline Hex Citation',
            editorCallback: (editor: Editor) => {
                console.log('add-hex-citation command triggered');
                try {
                    const cursor = editor.getCursor();
                    console.log('Cursor position:', cursor);
                    
                    const hexId = this.generateHexId();
                    console.log('Generated hex ID:', hexId);
                    
                    const selection = editor.getSelection();
                    console.log('Current selection:', selection);
                    
                    if (selection) {
                        // If text is selected, wrap it with the citation
                        console.log('Wrapping selection with citation');
                        editor.replaceSelection(`[^${hexId}] ${selection}`);
                        
                        // Position cursor after the inserted content
                        const newPos = editor.posToOffset(cursor) + hexId.length + 4 + selection.length;
                        editor.setCursor(editor.offsetToPos(newPos));
                    } else {
                        // If no text selected, just insert the citation
                        console.log('Inserting citation at cursor');
                        editor.replaceRange(`[^${hexId}]`, cursor);
                        
                        // Position cursor after the inserted citation
                        const newPos = editor.posToOffset(cursor) + hexId.length + 3;
                        editor.setCursor(editor.offsetToPos(newPos));
                    }
                    
                    console.log('Inline citation insertion complete');
                } catch (error) {
                    console.error('Error in add-hex-citation:', error);
                    new Notice('Error adding citation: ' + (error instanceof Error ? error.message : String(error)));
                }
            }
        });

        // Simple curl command with NDJSON streaming support
        this.addCommand({
            id: 'curl-request',
            name: 'Curl Request',
            editorCallback: (editor: Editor) => {
                const sel = editor.getSelection() || '';
                const json = sel.match(/```[\s\S]*?```/)?.[0].replace(/```[\s\S]*?\n|```/g, '') || '';
                if (!json) { 
                    new Notice('No request found'); 
                    return; 
                }

                // Save current content and add a new line for the response
                const currentContent = editor.getValue();
                editor.setValue(currentContent + '\n'); // Add new line for response
                
                // Use spawn instead of exec to handle streaming
                const { spawn } = require('child_process');
                const echo = spawn('echo', [json]);
                const curl = spawn('curl', [
                    '-s',
                    '-X', 'POST',
                    '-H', 'Content-Type: application/json',
                    '--no-buffer',
                    '--data-binary', '@-',
                    'http://localhost:3030/api/search'
                ]);

                let responseText = '';
                
                // Pipe echo to curl
                echo.stdout.pipe(curl.stdin);

                // Handle curl output
                curl.stdout.on('data', (data: Buffer) => {
                    const lines = data.toString().split('\n').filter(line => line.trim());
                    
                    lines.forEach(line => {
                        try {
                            const message = JSON.parse(line);
                            if (message.type === 'response' && message.data) {
                                responseText += message.data;
                                
                                // Update the editor with the current response
                                const currentContent = editor.getValue();
                                const newContent = currentContent + message.data;
                                editor.setValue(newContent);
                                
                                // Move cursor to end of content
                                const pos = editor.offsetToPos(newContent.length);
                                editor.setCursor(pos);
                            }
                        } catch (e) {
                            // Ignore JSON parse errors for partial lines
                        }
                    });
                });

                curl.stderr.on('data', (data: Buffer) => {
                    new Notice(`Error: ${data.toString()}`);
                });

                curl.on('close', (code: number) => {
                    if (code !== 0) {
                        new Notice(`Process exited with code ${code}`);
                    }
                });
            }
        });

        this.addCommand({
            id: 'send-request-from-selection',
            name: 'Send Request from Selection',
            editorCallback: async (editor) => {
                const selection = editor.getSelection();
                if (!selection) {
                    new Notice('Please select a code block with the request JSON');
                    return;
                }

                try {
                    // Extract JSON from code block
                    const jsonMatch = selection.match(/```(?:requestjson--perplexica)?\n?([\s\S]*?)\n?```/);
                    if (!jsonMatch || !jsonMatch[1]) {
                        throw new Error('No valid JSON found in selection');
                    }

                    const jsonString = jsonMatch[1].trim();
                    // Log the extracted JSON for debugging
                    console.log('Extracted JSON:', jsonString);
                    
                    // Validate JSON syntax
                    try {
                        JSON.parse(jsonString); // Just validate, we'll use the string as-is
                        await this.sendRequest(jsonString, editor);
                    } catch (e: unknown) {
                        const error = e as Error;
                        console.error('JSON parse error:', error);
                        throw new Error(`Invalid JSON in code block: ${error.message}`);
                    }
                } catch (error) {
                    console.error('Error processing request:', error);
                    new Notice(`Error: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        });
    }
}

class ContentFarmModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Content Farm' });
        contentEl.createEl('p', { text: 'Welcome to Content Farm Plugin!' });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class ContentFarmSettingTab extends PluginSettingTab {
    plugin: ContentFarmPlugin;

    constructor(app: App, plugin: ContentFarmPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Content Farm Settings' });

        new Setting(containerEl)
            .setName('Custom Setting')
            .setDesc('Configure your content farm settings')
            .addText(text => text
                .setPlaceholder('Enter your setting')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value: string) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                })
            );
        
        new Setting(containerEl)
        .setName('Local LLM Path or Port')
        .setDesc('Configure your local LLM path or port')
        .addText(text => text
            .setPlaceholder('http://localhost:11434')
            .setValue(this.plugin.settings.localLLMPath)
            .onChange(async (value: string) => {
                this.plugin.settings.localLLMPath = value;
                await this.plugin.saveSettings();
            })
        );

        // Create a textarea for JSON configuration
        const jsonSetting = new Setting(containerEl)
            .setName('Request Body Template')
            .setDesc('Enter your request body template as JSON');
            
        // Create a textarea element
        const textArea = document.createElement('textarea');
        textArea.rows = 10;
        textArea.cols = 50;
        textArea.style.width = '100%';
        textArea.style.minHeight = '300px';
        textArea.style.fontFamily = 'monospace';
        textArea.placeholder = '{\n  "chatModel": {\n    "provider": "openai",\n    "name": "gpt-4o-mini"\n  },\n  "embeddingModel": {\n    "provider": "openai",\n    "name": "text-embedding-3-large"\n  },\n  "optimizationMode": "speed",\n  "focusMode": "webSearch",\n  "query": "What is Perplexica",\n  "history": [\n    ["human", "Hi, how are you?"],\n    ["assistant", "I am doing well, how can I help you today?"]\n  ],\n  "systemInstructions": "Focus on providing technical details about Perplexica\\\'s architecture.",\n  "stream": false\n}';
        
        // Set initial value if it exists
        if (this.plugin.settings.requestBodyTemplate) {
            try {
                const config = JSON.parse(this.plugin.settings.requestBodyTemplate);
                textArea.value = JSON.stringify(config, null, 2);
            } catch (e) {
                // If not valid JSON, use as is
                textArea.value = this.plugin.settings.requestBodyTemplate;
            }
        }
        
        // Add input event listener
        textArea.addEventListener('input', async () => {
            this.plugin.settings.localLLMPath = textArea.value;
            await this.plugin.saveSettings();
        });
        
        // Add the textarea to the setting
        jsonSetting.settingEl.appendChild(textArea);
    }
}
