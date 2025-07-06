import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

declare module 'obsidian' {
  interface App {
    commands: any;
  }
  
  interface Editor {
    getSelection(): string;
    replaceSelection(text: string): void;
    getCursor(): { line: number, ch: number };
    setCursor(line: number, ch: number): void;
    lastLine(): number;
  }

  interface MarkdownView {
    file: TFile;
    editor: Editor;
  }

  interface PluginManifest {
    dir: string;
  }
}
