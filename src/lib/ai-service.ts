interface AIResponse {
  success: boolean;
  questions?: string;
  error?: string;
}

export class AIService {
  private static API_KEY_STORAGE_KEY = 'openai_api_key';

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static async generateMCQs(
    content: string, 
    numberOfQuestions: number = 5,
    apiKey?: string
  ): Promise<AIResponse> {
    const key = apiKey || this.getApiKey();
    
    if (!key) {
      return { success: false, error: 'API key not found' };
    }

    const prompt = `Based on the following content, generate ${numberOfQuestions} multiple-choice questions in pipe-separated format. Each line should be: Question | Option A | Option B | Option C | Option D | Answer (A, B, C, or D)

Content:
${content}

Generate exactly ${numberOfQuestions} questions, one per line, in the specified format.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an educational assistant that creates multiple-choice questions. Always respond with questions in the exact pipe-separated format requested.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error?.message || 'Failed to generate questions' 
        };
      }

      const data = await response.json();
      const questions = data.choices[0]?.message?.content?.trim();

      if (!questions) {
        return { success: false, error: 'No questions generated' };
      }

      return { success: true, questions };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to OpenAI API' 
      };
    }
  }

  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}