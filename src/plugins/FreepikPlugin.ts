import { App, Editor, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { FreepikModal } from '../modals/FreepikModal';
import { FreepikService, FreepikImage } from '../services/freepikService';

interface FreepikPluginSettings {
  apiKey: string;
}

const DEFAULT_SETTINGS: FreepikPluginSettings = {
  apiKey: process.env.FREEPIK_API_KEY || ''
};

export default class FreepikPlugin extends Plugin {
  settings: FreepikPluginSettings = DEFAULT_SETTINGS;
  public freepikService: FreepikService = new FreepikService();
  
  async onload() {
    await this.loadSettings();
    
    if (this.settings.apiKey) {
      this.freepikService.setApiKey(this.settings.apiKey);
    }

    this.addCommand({
      id: 'search-freepik',
      name: 'Search Freepik',
      editorCallback: (editor: Editor) => {
        if (!this.freepikService.hasApiKey()) {
          new Notice('Please set your Freepik API key in settings first');
          return;
        }
        
        const modal = new FreepikModal(this.app, this, async (image: FreepikImage) => {
          try {
            const cursor = editor.getCursor();
            editor.replaceRange(
              `![](${image.image.source.url})`,
              cursor,
              cursor
            );
          } catch (error) {
            console.error('Error inserting image:', error);
            new Notice('Failed to insert image');
          }
        });
        modal.open();
      }
    });

    this.addSettingTab(new FreepikSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class FreepikSettingTab extends PluginSettingTab {
  plugin: FreepikPlugin;

  constructor(app: App, plugin: FreepikPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Freepik Settings' });

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Your Freepik API key')
      .addText(text =>
        text
          .setPlaceholder('Enter your API key')
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            this.plugin.freepikService.setApiKey(value);
            await this.plugin.saveSettings();
          })
      );
  }
}
