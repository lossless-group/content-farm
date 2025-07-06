import { exec } from 'child_process';

export interface FreepikImage {
    id: number;
    title: string;
    url: string;
    image: {
        source: {
            url: string;
            size: string;
        };
    };
    author: {
        name: string;
        avatar: string;
    };
}

export interface FreepikSearchResult {
    data: FreepikImage[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export class FreepikService {
    private apiKey: string = '';
    private static readonly API_URL = 'https://api.freepik.com/v1';

    setApiKey(apiKey: string): void {
        this.apiKey = apiKey.trim();
    }

    hasApiKey(): boolean {
        return !!this.apiKey;
    }

    async searchImages(term: string, limit: number = 10): Promise<FreepikSearchResult> {
        if (!this.apiKey) {
            throw new Error('Please configure your Freepik API key in settings');
        }

        // Build query parameters according to Freepik API documentation
        const params = new URLSearchParams({
            term: term,
            per_page: limit.toString(),
            page: '1',
            clean_search: 'true'
        });

        const curlCmd = `
            curl -X GET \
                "${FreepikService.API_URL}/resources?${params.toString()}" \
                -H "Accept: application/json" \
                -H "x-freepik-api-key: ${this.apiKey}" \
                --silent --show-error
        `;

        try {
            const result = await new Promise<string>((resolve, reject) => {
                exec(curlCmd, (error, stdout, stderr) => {
                    if (error || stderr) {
                        console.error('Curl error:', error || stderr);
                        return reject(error || new Error(stderr));
                    }
                    resolve(stdout);
                });
            });

            return JSON.parse(result) as FreepikSearchResult;
        } catch (error) {
            console.error('Freepik API error:', error);
            throw new Error(`Failed to search images: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
