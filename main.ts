import { App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, Editor } from 'obsidian';
import * as crypto from 'crypto';
import { MCPClient } from './src/mcp/client';
import { streamToEditor } from './src/utils/streaming';

interface ContentFarmSettings {
    mySetting: string;
    localLLMPath: string;
    mcpServerUrl: string;
    autoEnhanceOnOpen: boolean;
    requestBodyTemplate: string;
    enhanceBodyTemplate: string;
}

const DEFAULT_SETTINGS: ContentFarmSettings = {
    mySetting: 'default',
    localLLMPath: 'http://localhost:3030/api/search',
    mcpServerUrl: 'http://localhost:4444',
    autoEnhanceOnOpen: false,
    requestBodyTemplate: JSON.stringify({
        chatModel: {
            provider: 'ollama',
            name: 'llama3.2:latest'
        },
        embeddingModel: {
            provider: 'ollama',
            name: 'llama3.2:latest'
        },
        optimizationMode: 'speed',
        focusMode: 'webSearch',
        query: 'What is Perplexicas architecture',
        history: [
            ['human', 'Hi, how are you?'],
            ['assistant', 'I am doing well, how can I help you today?']
        ],
        systemInstructions: 'Focus on providing technical details about Perplexicas architecture.',
        stream: false
    }),
    enhanceBodyTemplate: JSON.stringify({
        chatModel: {
            provider: 'ollama',
            name: 'llama3.2:latest'
        },
        embeddingModel: {
            provider: 'ollama',
            name: 'llama3.2:latest'
        },
        optimizationMode: 'speed',
        focusMode: 'webSearch',
        query: 'The content of the markdown file is not as robust, and the citations are not as rigorous as we would like them to be. Please enhance the content with more research and citations, focusing on recent sources with links',
        history: [
            ['human', 'Hi, how are you?'],
            ['assistant', 'I am doing well, how can I help you today?']
        ],
        systemInstructions: 'Focus on authoritative sources, or recognizable or reputable sources. Output content in Markdown with good structure.',
        stream: false
    })
};

export default class ContentFarmPlugin extends Plugin {
    public settings: ContentFarmSettings = DEFAULT_SETTINGS;
    private statusBarItemEl: HTMLElement | null = null;
    private ribbonIconEl: HTMLElement | null = null;
    private mcpClient: MCPClient | null = null;

    async onload(): Promise<void> {
        await this.loadSettings();

        this.registerRibbonIcon();
        this.setupStatusBar();
        this.setupMCPClient();
        this.registerCommands();
        this.addSettingTab(new ContentFarmSettingTab(this.app, this));
        this.registerCitationCommands();
        
        // Auto-enhance on open if enabled
        this.app.workspace.on('file-open', (file) => {
            if (file && file instanceof TFile && file.extension === 'md' && this.settings.autoEnhanceOnOpen) {
                this.enhanceActiveNote();
            }
        });
    }

    private async setupMCPClient() {
        this.mcpClient = new MCPClient(this.settings.mcpServerUrl);
        try {
            const connected = await this.mcpClient.connect();
            new Notice(connected ? 'Connected to MCP server' : 'Failed to connect to MCP server');
        } catch (error) {
            console.error('MCP connection error:', error);
            new Notice('Error connecting to MCP server');
        }
    }

    private async enhanceActiveNote(editor?: Editor) {
        try {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!view) return;

            const currentEditor = editor || view.editor;
            const content = currentEditor.getValue();
            
            if (!this.mcpClient) {
                await this.setupMCPClient();
            }

            if (this.mcpClient) {
                const enhancedContent = await this.mcpClient.enhanceWithResearch(content);
                currentEditor.setValue(enhancedContent);
                new Notice('Note enhanced with research');
            } else {
                throw new Error('MCP client not initialized');
            }
        } catch (error) {
            console.error('Enhancement failed:', error);
            new Notice('Failed to enhance note with research');
        }
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
        const collectCitations = (match: string, id: string) => {
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
                return collectCitations(match, id);
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
        updatedContent = updatedContent.replace(/\[\^([0-9a-f]{6})\]:\s*/gi, (_match, hexId) => {
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

    private extractRequestTemplate(content: string): { template: any; content: string } {
        // Check for code block with requestjson--perplexica language
        const codeBlockRegex = /```requestjson--perplexica\s*([\s\S]*?)```/;
        const match = content.match(codeBlockRegex);
        
        if (match && match[1]) {
            try {
                const template = JSON.parse(match[1]);
                // Remove the code block from content if it exists
                const cleanContent = content.replace(codeBlockRegex, '').trim();
                return { template, content: cleanContent };
            } catch (error) {
                console.error('Error parsing request template:', error);
                new Notice('Error parsing request template. Using default.');
            }
        }
        
        // Return default template if no valid template found
        return {
            template: JSON.parse(this.settings.enhanceBodyTemplate),
            content
        };
    }

    private async enhanceWithPerplexica(content: string, editor: Editor): Promise<void> {
        try {
            // Extract template and clean content
            const { template, content: cleanContent } = this.extractRequestTemplate(content);
            
            // Prepare request data with template and content
            const requestData = {
                ...template,
                query: cleanContent,
                stream: true
            };

            const response = await fetch(this.settings.localLLMPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await streamToEditor({
                response,
                editor,
                insertPos: { line: editor.getCursor().line + 1, ch: 0 }
            });
        } catch (error) {
            console.error('Error enhancing content with Perplexica:', error);
            const errorMessage = `Error: ${error instanceof Error ? error.message : String(error)}`;
            new Notice(errorMessage);
            editor.replaceRange(`\n${errorMessage}`, editor.getCursor());
        }
    }

    private async sendRequest(jsonString: string, editor?: Editor): Promise<string> {
        try {
            const response = await fetch(this.settings.localLLMPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: jsonString,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Parse JSON to check if it's a streaming request
            const requestData = JSON.parse(jsonString);
            if (requestData.stream && editor) {
                const cursor = editor.getCursor();
                const insertPos = { line: cursor.line + 1, ch: 0 };
                editor.replaceRange('\n', cursor);
                
                // Use the shared streaming utility
                return await streamToEditor({
                    response,
                    editor,
                    insertPos
                });
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
                    console.error('Request failed:', error);
                    return '';
                }
            }
        } catch (error) {
            console.error('Error sending request:', error);
            const errorMessage = `Error: ${error instanceof Error ? error.message : String(error)}`;
            if (editor) {
                editor.replaceRange('\n' + errorMessage, editor.getCursor());
            }
            throw new Error(errorMessage);
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

        // Command to enhance selected text with Perplexica
        this.addCommand({
            id: 'enhance-with-perplexica',
            name: 'Enhance with Perplexica',
            editorCallback: async (editor: Editor) => {
                const selection = editor.getSelection();
                if (!selection) {
                    new Notice('Please select some text to enhance');
                    return;
                }
                await this.enhanceWithPerplexica(selection, editor);
            }
        });
        
        // Command to enhance selected text with research
        this.addCommand({
            id: 'enhance-with-research',
            name: 'Enhance with Research',
            editorCallback: async (editor: Editor) => {
                try {
                    const selection = editor.getSelection();
                    if (!selection) {
                        new Notice('Please select some text to enhance');
                        return;
                    }

                    if (!this.mcpClient) {
                        await this.setupMCPClient();
                    }

                    if (this.mcpClient) {
                        this.mcpClient.setEditor(editor);
                        const enhancedContent = await this.mcpClient.enhanceWithResearch(selection);
                        editor.replaceSelection(enhancedContent);
                        new Notice('Text enhanced with research');
                    } else {
                        throw new Error('MCP client not initialized');
                    }
                } catch (error) {
                    console.error('Enhancement failed:', error);
                    new Notice('Failed to enhance text with research');
                }
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
                editor.replaceSelection(
                    '```requestjson--perplexica\n' + 
                    this.settings.requestBodyTemplate + '\n' +
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
        contentEl.createEl('p', { text: 'Content Farm plugin is active.' });
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
