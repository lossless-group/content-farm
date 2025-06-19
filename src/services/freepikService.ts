import { Notice } from 'obsidian';
import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config({ path: `${process.cwd()}/.env` });

export interface FreepikImage {
    id: string;
    url: string;
    title: string;
    thumbnail: string;
    premium: boolean;
}

export class FreepikService {
    private static readonly API_BASE_URL = 'https://api.freepik.com/v1';
    private static readonly SEARCH_ENDPOINT = '/resources';
    private apiKey: string;
    private headers: Headers;

    constructor() {
        this.apiKey = process.env.FREEPIK_API_KEY || '';
        this.headers = new Headers();
        this.updateApiKey(this.apiKey);
        
        logger.info('FreepikService initialized', { hasApiKey: !!this.apiKey });
        
        if (!this.apiKey) {
            const errorMsg = 'Freepik API key not found. Please check your .env file or plugin settings.';
            logger.error(errorMsg);
            new Notice(errorMsg);
        } else {
            logger.debug('Using API key from environment variables');
        }
    }

    /**
     * Search for images on Freepik
     * @param query Search query
     * @param limit Number of results to return (max 80)
     * @param page Page number
     */
    /**
     * Update the API key used for requests
     * @param apiKey The new API key to use
     */
    updateApiKey(apiKey: string): void {
        if (!apiKey) {
            logger.warn('Attempted to set empty API key');
            return;
        }
        
        this.apiKey = apiKey;
        
        // Update headers with the new API key
        this.headers = new Headers({
            'Content-Type': 'application/json',
            'x-freepik-api-key': this.apiKey
        });
        
        logger.debug('Updated API key in FreepikService');
    }

    /**
     * Search for images on Freepik
     * @param query Search query string
     * @param limit Maximum number of results to return (default: 20)
     * @param page Page number for pagination (default: 1)
     * @returns Array of FreepikImage objects
     */
    async searchImages(query: string, limit: number = 20, page: number = 1): Promise<FreepikImage[]> {
        if (!this.apiKey) {
            const errorMsg = 'Freepik API key is not configured. Please set it in the plugin settings.';
            logger.error(errorMsg);
            new Notice(errorMsg);
            return [];
        }

        try {
            logger.debug('Sending request to Freepik API', { query, limit, page });
            const url = new URL(`${FreepikService.API_BASE_URL}${FreepikService.SEARCH_ENDPOINT}`);
            url.searchParams.append('query', query);
            url.searchParams.append('limit', limit.toString());
            url.searchParams.append('page', page.toString());
            
            logger.debug('API URL:', { url: url.toString() });
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: this.headers
            });

            const responseText = await response.text();
            logger.debug('Freepik API response', {
                status: response.status,
                statusText: response.statusText,
                response: responseText.slice(0, 500) // Log first 500 chars to avoid huge logs
            });

            if (!response.ok) {
                throw new Error(`Freepik API error (${response.status}): ${response.statusText}\n${responseText}`);
            }

            const data = JSON.parse(responseText);

            // The actual response format might need to be adjusted based on the API response
            // This is a best guess - we'll need to check the actual response format
            const items = data.data || data.items || [];
            
            if (!Array.isArray(items)) {
                logger.warn('Unexpected API response format - expected array', { data });
                return [];
            }

            const images: FreepikImage[] = items.map((item: any) => ({
                id: item.id || '',
                url: item.url || item.image_url || '',
                title: item.title || item.description || '',
                thumbnail: item.thumbnail || item.thumbnail_url || item.url || '',
                premium: item.premium || item.is_premium || false
            }));

            logger.info(`Found ${images.length} images for query: ${query}`);
            return images;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorMsg = `Failed to search Freepik: ${errorMessage}`;
            logger.error(errorMsg, { error });
            new Notice(errorMsg);
            return [];
        }
    }

    /**
     * Get image details by ID
     * @param imageId Freepik image ID
     */
    async getImageDetails(imageId: string): Promise<FreepikImage | null> {
        try {
            const response = await fetch(
                `${FreepikService.API_BASE_URL}/images/${imageId}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-Freepik-API-Key': this.apiKey
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Freepik API error: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                id: data.id,
                url: data.url,
                title: data.title,
                thumbnail: data.image.small,
                premium: data.premium
            };
        } catch (error) {
            console.error('Error getting Freepik image details:', error);
            new Notice('Failed to get image details. Check console for details.');
            return null;
        }
    }
}
