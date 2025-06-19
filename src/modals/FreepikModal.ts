import { App, Modal, Notice } from 'obsidian';
import { FreepikImage, FreepikSearchResult } from '../services/freepikService';

export class FreepikModal extends Modal {
    private searchQuery: string = '';
    private images: FreepikImage[] = [];
    private onSelect: (image: FreepikImage) => Promise<void>;
    private resultsContainer!: HTMLElement;

    constructor(
        app: App,
        private plugin: { freepikService: { searchImages: (query: string) => Promise<FreepikSearchResult> } },
        onSelect: (image: FreepikImage) => Promise<void>
    ) {
        super(app);
        this.onSelect = onSelect;
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
        this.resultsContainer = this.contentEl.createDiv('freepik-results');
        
        // Initial search if there's a query
        if (this.searchQuery) {
            this.performSearch();
        }
    }

    private async performSearch() {
        if (!this.resultsContainer) return;
        
        this.resultsContainer.empty();
        this.resultsContainer.createEl('p', { text: 'Searching...' });

        try {
            const result = await this.plugin.freepikService.searchImages(this.searchQuery);
            this.images = result?.data || [];
            this.resultsContainer.empty();

            if (this.images.length === 0) {
                this.resultsContainer.createEl('p', { 
                    text: 'No images found. Try a different search term.',
                    cls: 'freepik-no-results'
                });
                return;
            }

            const grid = this.resultsContainer.createDiv('freepik-grid');
            this.images.forEach(image => {
                const imgContainer = grid.createDiv('freepik-image-container');
                
                // Image thumbnail
                const img = imgContainer.createEl('img', { 
                    attr: { 
                        src: image.image?.source?.url || '',
                        alt: image.title || ''
                    },
                    cls: 'freepik-thumbnail'
                });
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';

                // Image title
                const title = image.title || 'Untitled';
                imgContainer.createEl('p', { 
                    text: title.length > 30 ? title.substring(0, 30) + '...' : title,
                    cls: 'freepik-title'
                });

                // Handle image click
                imgContainer.onclick = async () => {
                    try {
                        await this.onSelect(image);
                        this.close();
                    } catch (error) {
                        console.error('Error selecting image:', error);
                        new Notice('Failed to select image. Please try again.');
                    }
                };
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error performing search:', error);
            
            if (this.resultsContainer) {
                this.resultsContainer.empty();
                const errorEl = this.resultsContainer.createEl('div', { 
                    text: `Error: ${errorMessage}`,
                    cls: 'freepik-error-message'
                });
                errorEl.style.color = 'red';
                errorEl.style.margin = '10px 0';
            }
            
            new Notice(`Search failed: ${errorMessage}`);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
