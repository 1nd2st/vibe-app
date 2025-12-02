import { getOpenAIClient } from "../api/openai";
import { useSettingsStore } from "../state/settingsStore";
import * as FileSystem from "expo-file-system";

/**
 * Analyze an image for damage using AI vision models
 * @param imageUri - Local URI of the image to analyze
 * @returns AI-generated damage description or null if no damage detected
 */
export const analyzeImageForDamage = async (imageUri: string): Promise<string | null> => {
  try {
    const settings = useSettingsStore.getState().settings;

    // Check if AI is enabled
    if (!settings.aiEnabled) {
      return null;
    }

    const prompt = settings.aiPrompt || "Analyze this artwork/item photo and identify any visible damage, wear, scratches, cracks, discoloration, or condition issues. Be specific about location and severity.";

    // Use OpenAI by default or if GPT-4o is selected
    if (settings.aiModel === "gpt-4o" || !settings.aiModel) {
      return await analyzeWithOpenAI(imageUri, prompt);
    } else if (settings.aiModel === "claude-3-5-sonnet") {
      // Claude requires API key setup
      const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.warn("Claude selected but API key not available, falling back to OpenAI");
        return await analyzeWithOpenAI(imageUri, prompt);
      }

      // Try Claude, but fall back to OpenAI if it fails
      try {
        return await analyzeWithClaude(imageUri, prompt);
      } catch (claudeError) {
        console.warn("Claude analysis failed, falling back to OpenAI:", claudeError);
        return await analyzeWithOpenAI(imageUri, prompt);
      }
    }

    // Fallback to OpenAI
    return await analyzeWithOpenAI(imageUri, prompt);
  } catch (error) {
    console.error("AI damage detection error:", error);
    // Return a user-friendly error message instead of throwing
    return "AI analysis failed. Please try again or add notes manually.";
  }
};

/**
 * Analyze image using OpenAI GPT-4o Vision
 */
const analyzeWithOpenAI = async (imageUri: string, prompt: string): Promise<string | null> => {
  try {
    const client = getOpenAIClient();

    // Read the image file and convert to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || "";
    return content.trim() || null;
  } catch (error) {
    console.error("OpenAI vision analysis error:", error);
    throw error;
  }
};

/**
 * Analyze image using Anthropic Claude 3.5 Sonnet
 */
const analyzeWithClaude = async (imageUri: string, prompt: string): Promise<string | null> => {
  // Read the image file and convert to base64
  const base64Image = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Get the API key from environment
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key not found");
  }

  // Try newest model first, fall back to older stable version if not available
  const models = ["claude-3-5-sonnet-20241022", "claude-3-5-sonnet-20240620"];

  for (const model of models) {
    try {
      // Make direct API call to Anthropic
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: base64Image,
                  },
                },
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.content?.[0]?.text || "";
        return content.trim() || null;
      }

      // If not found error, try next model
      const errorData = await response.json();
      if (errorData.error?.type === "not_found_error") {
        // Silently try next model
        continue;
      }

      // Other errors, throw with details
      throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(errorData)}`);
    } catch (fetchError: any) {
      // If this is the last model, throw the error
      if (model === models[models.length - 1]) {
        throw fetchError;
      }
      // Otherwise silently continue to next model
    }
  }

  throw new Error("No Claude models available");
};
