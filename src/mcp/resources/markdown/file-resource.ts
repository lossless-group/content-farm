import { Resource } from '@modelcontextprotocol/sdk/server/resource';
import { config } from '../../../config/mcp';
import fs from 'fs/promises';
import path from 'path';

export class MarkdownFileResource implements Resource {
  async read(uri: URL): Promise<{ contents: Array<{ uri: string; text: string }> }> {
    const filePath = this.getFilePath(uri);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        contents: [{
          uri: uri.toString(),
          text: content,
          mimeType: 'text/markdown'
        }]
      };
    } catch (error) {
      throw new Error(`Failed to read markdown file: ${filePath}. ${error.message}`);
    }
  }

  async write(uri: URL, content: string): Promise<void> {
    const filePath = this.getFilePath(uri);
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write markdown file: ${filePath}. ${error.message}`);
    }
  }

  private getFilePath(uri: URL): string {
    // Remove the 'markdown://' protocol and ensure the path is within the content directory
    const relativePath = uri.pathname.replace(/^\//, '');
    const fullPath = path.join(process.cwd(), config.markdown.contentPath, relativePath);
    
    // Security: Prevent directory traversal
    const normalizedPath = path.normalize(fullPath);
    const contentRoot = path.normalize(path.join(process.cwd(), config.markdown.contentPath));
    
    if (!normalizedPath.startsWith(contentRoot)) {
      throw new Error('Access to the requested path is not allowed');
    }

    // Check file extension
    const ext = path.extname(normalizedPath).toLowerCase();
    if (!config.markdown.allowedExtensions.includes(ext)) {
      throw new Error(`Unsupported file extension: ${ext}`);
    }

    return normalizedPath;
  }
}
