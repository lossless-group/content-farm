import { App, Modal, Notice } from 'obsidian';
import FreepikPlugin from '../plugins/FreepikPlugin';
import { FreepikService, FreepikImage } from '../services/freepikService';
import { logger } from '../utils/logger';

export class FreepikModal extends Modal {
    private freepikService: FreepikService | null = null;
    private searchQuery: string = '';
    private images: FreepikImage[] = [];
    private selectedImage: FreepikImage | null = null;
    private onSelect: (image: FreepikImage) => Promise<void>;
    private plugin: FreepikPlugin;

    constructor(
        app: App,
        plugin: FreepikPlugin,
        onSelect: (image: FreepikImage) => Promise<void>
    ) {
        super(app);
        this.plugin = plugin;
        this.freepikService = plugin.freepikService;
        this.onSelect = onSelect;
        
        if (!this.freepikService) {
            logger.error('FreepikService not initialized in modal');
            new Notice('Plugin not properly initialized. Please restart Obsidian.');
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Create search input
        const searchContainer = contentEl.createDiv('freepik-search-container');
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: 'Search for images on Freepik...',
            value: this.searchQuery
        });
        
        const searchButton = searchContainer.createEl('button', { text: 'Search' });
        searchButton.onclick = async () => {
            this.searchQuery = searchInput.value.trim();
            if (this.searchQuery) {
                await this.performSearch();
            }
        };

        // Handle Enter key
        searchInput.onkeydown = async (e) => {
            if (e.key === 'Enter') {
                this.searchQuery = searchInput.value.trim();
                if (this.searchQuery) {
                    await this.performSearch();
                }
            }
        };

        // Results container
        this.contentEl.createEl('h3', { text: 'Search Results' });
        const resultsContainer = this.contentEl.createDiv('freepik-results');
        
        // Initial search if there's a query
        if (this.searchQuery) {
            this.performSearch();
        }
    }

    private async performSearch() {
        const resultsContainer = this.contentEl.querySelector('.freepik-results');
        if (!resultsContainer) {
            logger.error('Results container not found in FreepikModal');
            return;
        }

        resultsContainer.empty();
        const statusEl = resultsContainer.createEl('p', { text: 'Searching...' });

        if (!this.freepikService) {
            logger.error('FreepikService not available for search');
            statusEl.setText('Error: Service not available');
            return;
        }

        try {
            logger.info(`Initiating search for: "${this.searchQuery}"`);
            this.images = await this.freepikService.searchImages(this.searchQuery);
            resultsContainer.empty();

            if (this.images.length === 0) {
                const noResultsMsg = 'No images found. Try a different search term.';
                logger.info(noResultsMsg, { query: this.searchQuery });
                resultsContainer.createEl('p', { 
                    text: noResultsMsg,
                    cls: 'freepik-no-results'
                });
                return;
            }

            const grid = resultsContainer.createDiv('freepik-grid');
            this.images.forEach(image => {
                const imgContainer = grid.createDiv('freepik-image-container');
                
                // Image thumbnail
                imgContainer.createEl('img', { 
                    attr: { 
                        src: image.thumbnail,
                        alt: image.title
                    },
                    cls: 'freepik-thumbnail'
                });

                // Image title
                imgContainer.createEl('p', { 
                    text: image.title.length > 30 
                        ? image.title.substring(0, 30) + '...' 
                        : image.title,
                    cls: 'freepik-title'
                });

                // Select button
                const selectButton = imgContainer.createEl('button', { 
                    text: 'Select',
                    cls: 'freepik-select-button'
                });
                
                selectButton.onclick = async () => {
                    this.selectedImage = image;
                    try {
                        logger.debug('Selected image', { imageId: image.id });
                        await this.onSelect(image);
                        logger.info('Image selection successful', { imageId: image.id });
                        this.close();
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        const errorDetails = error instanceof Error ? { stack: error.stack } : {};
                        
                        logger.error('Error selecting image', { 
                            error: errorMessage,
                            ...errorDetails,
                            imageId: image?.id 
                        });
                        
                        // Update the status message with the error
                        statusEl.textContent = `Error: ${errorMessage}`;
                        statusEl.addClass('freepik-error');
                        
                        // Show a more detailed error message in the UI
                        resultsContainer.createEl('p', { 
                            text: 'Failed to select image. Please check your API key and internet connection.',
                            cls: 'freepik-error-message'
                        });
                        
                        new Notice(`Image selection failed: ${errorMessage}`);
                    }
                };
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorDetails = error instanceof Error ? { stack: error.stack } : {};
            
            logger.error('Error performing search', { 
                error: errorMessage,
                ...errorDetails,
                query: this.searchQuery 
            });
            
            // Update the status message with the error
            statusEl.textContent = `Error: ${errorMessage}`;
            statusEl.addClass('freepik-error');
            
            // Show a more detailed error message in the UI
            resultsContainer.createEl('p', { 
                text: 'Failed to search Freepik. Please check your API key and internet connection.',
                cls: 'freepik-error-message'
            });
            
            new Notice(`Search failed: ${errorMessage}`);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
