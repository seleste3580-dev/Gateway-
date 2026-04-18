export interface AIRequest {
  prompt: string;
  model: string;
  provider: "gemini" | "openai" | "anthropic";
  config?: any;
}

export interface AIResponse {
  response: string;
  provider: string;
  error?: string;
}

export async function routeAI(request: AIRequest): Promise<AIResponse> {
  const response = await fetch("/api/route-ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to route AI");
  }

  return data;
}

export const AVAILABLE_MODELS = [
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "gemini" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", provider: "gemini" },
  { id: "gpt-4o", name: "OpenAI GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", name: "OpenAI GPT-4o Mini", provider: "openai" },
  { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet", provider: "anthropic" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "anthropic" },
];
