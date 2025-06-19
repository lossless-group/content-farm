import * as crypto from 'crypto';

export interface CitationConversionResult {
    updatedContent: string;
    changed: boolean;
    stats: {
        citationsConverted: number;
    };
}

export class CitationService {
    /**
     * Generate a random hex ID of specified length
     * @param length - Length of the hex ID to generate (default: 6)
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
    public convertCitations(content: string): CitationConversionResult {
        let updatedContent = content;
        let citationsConverted = 0;
        const citationMap = new Map<string, string>(); // Maps original ID to hex ID
        
        // First pass: collect all citations and generate hex IDs
        const collectCitations = (match: string, _prefix: string, id: string) => {
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

        // Second pass: replace all collected citations with their hex equivalents
        citationMap.forEach((hexId, originalId) => {
            // Replace [^123] style citations
            updatedContent = updatedContent.replace(
                new RegExp(`\\[\\^${originalId}\\]`, 'g'), 
                `[^${hexId}]`
            );
            
            // Replace [123] style citations (only if not part of a link)
            updatedContent = updatedContent.replace(
                new RegExp(`(^|[^\\])\\[${originalId}\\]`, 'g'),
                `$1[^${hexId}]`
            );
            
            citationsConverted++;
        });

        return {
            updatedContent,
            changed: citationsConverted > 0,
            stats: {
                citationsConverted
            }
        };
    }
}

// Export a singleton instance
export const citationService = new CitationService();
