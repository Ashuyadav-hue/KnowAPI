import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private hasApiKey = false;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.logger.log('Gemini API key provided. Initializing Gemini Client.');
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.hasApiKey = true;
    } else {
      this.logger.warn(
        'GEMINI_API_KEY not found in environment. AI features will run in Mock Mode.'
      );
    }
  }

  /**
   * Set API key dynamically (useful if user enters it in settings)
   */
  setApiKey(apiKey: string) {
    this.logger.log('Setting Gemini API key dynamically.');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.hasApiKey = true;
  }

  isConfigured(): boolean {
    return this.hasApiKey;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.hasApiKey || !this.genAI) {
      // Return a simulated mock embedding vector (768 numbers)
      return this.generateMockEmbedding(text);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      if (result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
      throw new Error('No embedding values returned');
    } catch (err) {
      this.logger.error(`Gemini Embedding error: ${err.message}. Falling back to mock.`);
      return this.generateMockEmbedding(text);
    }
  }

  async generateCompletion(prompt: string, jsonMode = false): Promise<string> {
    if (!this.hasApiKey || !this.genAI) {
      // Simulate mock AI responses depending on the prompt contents
      return this.generateMockCompletion(prompt, jsonMode);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: jsonMode ? { responseMimeType: 'application/json' } : undefined,
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text;
    } catch (err) {
      this.logger.error(`Gemini Completion error: ${err.message}. Falling back to mock.`);
      return this.generateMockCompletion(prompt, jsonMode);
    }
  }

  // --- MOCK FALLBACK IMPLEMENTATIONS (So the app works instantly without keys) ---

  private generateMockEmbedding(text: string): number[] {
    // Generate a pseudo-random normalized 768-dimension vector based on text length and character codes
    const vec: number[] = new Array(768).fill(0);
    let sumSq = 0;
    for (let i = 0; i < 768; i++) {
      const charCode = text.charCodeAt(i % text.length) || 32;
      const noise = Math.sin(i + charCode);
      vec[i] = noise;
      sumSq += noise * noise;
    }
    // Normalize vector
    const magnitude = Math.sqrt(sumSq);
    return vec.map(v => v / magnitude);
  }

  private generateMockCompletion(prompt: string, jsonMode: boolean): string {
    this.logger.log('Generating Mock AI completion...');
    
    if (jsonMode) {
      // Tailor mock JSON based on what is being requested in the prompt
      const promptLower = prompt.toLowerCase();
      
      if (promptLower.includes('summary') && promptLower.includes('tags')) {
        // Document metadata extraction mock
        return JSON.stringify({
          summary: 'This is a mock summary of the uploaded document. To enable actual summary generation from the Gemini API, please configure a GEMINI_API_KEY in your settings page or environment variables.',
          tags: ['Mock', 'Demo', 'SetupNeeded'],
          topics: ['Introduction to Mock Content', 'Configuration Guide', 'Environment Setup'],
          faqs: [
            {
              question: 'Why am I seeing mock content?',
              answer: 'Because the GEMINI_API_KEY is not configured in the backend environment. Add it to .env to unlock real AI processing.',
            },
            {
              question: 'How do I add an API key?',
              answer: 'Go to the Settings tab in the sidebar and enter your Gemini API key, or add it as GEMINI_API_KEY in the server/.env file.',
            }
          ],
          endpoints: [
            {
              path: '/mock/overview',
              method: 'GET',
              description: 'Retrieve general instructions about configuring your Gemini API key.',
              responseSchema: JSON.stringify({
                status: 'string',
                steps: 'array of strings',
                documentationUrl: 'string',
              }),
            },
            {
              path: '/mock/features',
              method: 'GET',
              description: 'Fetch details on active vs inactive features based on configuration.',
              responseSchema: JSON.stringify({
                features: 'array of objects',
                active: 'boolean',
              }),
            }
          ]
        });
      }

      if (promptLower.includes('/mock/overview')) {
        return JSON.stringify({
          status: 'Demo mode active',
          steps: [
            'Obtain a Gemini API key from Google AI Studio.',
            'Save it via the settings page, or write it into the server/.env file.',
            'Re-upload your documents to trigger actual processing.'
          ],
          documentationUrl: 'https://ai.google.dev/'
        });
      }

      // Default mock JSON response matching schema requested
      return JSON.stringify({
        status: 'mock_ok',
        message: 'This is a mock JSON API response because no GEMINI_API_KEY is active.',
        timestamp: new Date().toISOString()
      });
    }

    // Text completion mock
    if (prompt.toLowerCase().includes('explain') || prompt.toLowerCase().includes('what')) {
      return 'You are running in Mock Mode because a `GEMINI_API_KEY` is not provided. \n\nTo enable full vector RAG search and AI responses based on your documents: \n1. Get an API key from Google AI Studio.\n2. Add it to the Settings panel in the sidebar, or set `GEMINI_API_KEY` in `server/.env`.\n3. Re-upload your documents to process them with the real Gemini models.';
    }

    return 'This is a mock response from the KnowledgeAPI backend. To enable real replies, please configure a GEMINI_API_KEY.';
  }
}
