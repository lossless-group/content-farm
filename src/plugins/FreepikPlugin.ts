import { App, Editor, Notice, Plugin, PluginManifest, PluginSettingTab, Setting } from 'obsidian';
import { FreepikModal } from '../modals/FreepikModal';
import { FreepikService, FreepikImage } from '../services/freepikService';
import { logger } from '../utils/logger';

interface FreepikPluginSettings {
  freepikApiKey: string;
  defaultLicense: 'free' | 'premium';
  defaultImageCount: number;
}

const DEFAULT_SETTINGS: FreepikPluginSettings = {
  freepikApiKey: process.env.FREEPIK_API_KEY || '',
  defaultLicense: 'free',
  defaultImageCount: 10
};

export default class FreepikPlugin extends Plugin {
  public settings: FreepikPluginSettings;
  public freepikService: FreepikService | null = null;
  
  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.settings = { ...DEFAULT_SETTINGS };
  }
  
  public async loadSettings(): Promise<void> {
    try {
      const data = await this.loadData();
      this.settings = { ...DEFAULT_SETTINGS, ...data };
      logger.debug('Freepik plugin settings loaded');
    } catch (error) {
      logger.error('Failed to load settings', error);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }
  
  public async saveSettings(): Promise<void> {
    try {
      await this.saveData(this.settings);
      logger.debug('Freepik plugin settings saved');
      
      // Update service with new API key if it changed
      if (this.freepikService) {
        this.freepikService.updateApiKey(this.settings.freepikApiKey);
      }
    } catch (error) {
      logger.error('Failed to save settings', error);
      throw error;
    }
  }

  async onload(): Promise<void> {
    try {
      // Initialize logger with the app's vault
      if (this.app.vault) {
        logger.initialize(this.app.vault);
        logger.info('FreepikPlugin loading');
      } else {
        console.error('Vault not available for logger initialization');
        return;
      }
      
      // Load settings
      await this.loadSettings();
      
      // Initialize FreepikService
      this.freepikService = new FreepikService();
      
      // Set API key from settings or environment
      const apiKey = this.settings.freepikApiKey || process.env.FREEPIK_API_KEY || '';
      if (apiKey) {
        this.freepikService.updateApiKey(apiKey);
        logger.info('Freepik plugin loaded with API key');
      } else {
        logger.warn('No Freepik API key configured');
        new Notice('Please configure your Freepik API key in settings');
      }

      // Load environment variables if .env file exists
      if (process.env.FREEPIK_API_KEY) {
        this.settings.freepikApiKey = process.env.FREEPIK_API_KEY;
        await this.saveSettings();
      }

      // Register commands
      this.registerCommands();

      // Add settings tab
      this.addSettingTab(new FreepikSettingTab(this.app, this));

      logger.info('FreepikPlugin loaded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to load Freepik plugin: ${errorMessage}`, { error });
      new Notice('Failed to load Freepik plugin. Check console for details.');
    }
  }

  /**
   * Update the API key in the service and settings
   * @param apiKey The new API key
   */
  public updateApiKey(apiKey: string): void {
    if (!apiKey) {
      new Notice('API key cannot be empty');
      return;
    }

    if (!this.freepikService) {
      logger.error('FreepikService not initialized');
      new Notice('Plugin initialization error. Please restart Obsidian.');
      return;
    }

    try {
      this.freepikService.updateApiKey(apiKey);
      this.settings.freepikApiKey = apiKey;
      logger.info('Updated Freepik API key');
      new Notice('Freepik API key updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to update API key: ${errorMessage}`, { error });
      new Notice('Failed to update API key. Check console for details.');
    }
  }

  /**
   * Register plugin commands
   */
  private registerCommands(): void {
    this.addCommand({
      id: 'open-freepik-modal',
      name: 'Search Freepik Images',
      editorCallback: (editor: Editor) => {
        if (!this.freepikService) {
          new Notice('Freepik service not initialized');
          return;
        }

        const modal = new FreepikModal(this.app, this, async (image: FreepikImage) => {
          try {
            // Insert the selected image as markdown
            const markdown = `![${image.title}](${image.url})\n> Image by [Freepik](${image.url} "${image.title}")`;
            editor.replaceSelection(markdown);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to insert image: ${errorMessage}`, { error });
            new Notice('Failed to insert image');
          }
        });

        modal.open();
      }
    });
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
      .addText(text => text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settings.freepikApiKey)
        .onChange(async (value) => {
          this.plugin.settings.freepikApiKey = value;
          if (value) {
            this.plugin.updateApiKey(value);
            await this.plugin.saveSettings();
          } else {
            new Notice('API key cannot be empty');
          }
        }));

    new Setting(containerEl)
      .setName('Default License')
      .setDesc('Choose the default license type for image searches')
      .addDropdown(dropdown => dropdown
        .addOption('free', 'Free')
        .addOption('premium', 'Premium')
        .setValue(this.plugin.settings.defaultLicense)
        .onChange(async (value: string) => {
        if (value === 'free' || value === 'premium') {
          this.plugin.settings.defaultLicense = value;
        }
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default Image Count')
      .setDesc('Number of images to show in search results')
      .addSlider(slider => slider
        .setLimits(5, 50, 5)
        .setValue(this.plugin.settings.defaultImageCount)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.defaultImageCount = value;
          await this.plugin.saveSettings();
        }));
  }
}
