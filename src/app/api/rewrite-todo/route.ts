import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Validate input length
    const MAX_TEXT_LENGTH = 5000;
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    // Validate API key format (should start with AIza)
    if (!apiKey.startsWith("AIza")) {
      return NextResponse.json(
        { error: "Invalid API key format. Gemini API keys should start with 'AIza'" },
        { status: 400 }
      );
    }

    const prompt = `Rewrite the following todo item to be clear and concise. Keep the essential meaning but make it more direct and actionable. Return only the rewritten text, nothing else.

Original: ${text}

Rewritten:`;

    // Try using the SDK first, fallback to direct HTTP if it fails
    // Note: SDK might timeout in some network environments, so we have a fallback
    let rewrittenText: string;
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Add a timeout wrapper for the SDK call
      const sdkPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("SDK timeout after 15 seconds")), 15000);
      });
      
      const result = await Promise.race([sdkPromise, timeoutPromise]) as Awaited<ReturnType<typeof model.generateContent>>;
      const response = await result.response;
      rewrittenText = response.text().trim();
    } catch (sdkError) {
      // Log error in development, keep minimal in production
      if (process.env.NODE_ENV === 'development') {
        console.error("SDK method failed, trying fallback:", sdkError);
      }
      
      try {
        // Fallback: Use direct HTTP fetch
        // Use v1beta endpoint (this is what the SDK uses internally)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
        
        // Create timeout manually for better compatibility
        // Use longer timeout for VPN connections (120 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 120000); // 120 seconds for VPN connections
        
        let fetchResponse: Response;
        try {
          // Use fetch with custom timeout and keepalive for better VPN compatibility
          fetchResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Connection": "keep-alive",
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }]
            }),
            signal: controller.signal,
            // Add keepalive for better connection handling
            keepalive: true,
          });
          
          // If 404, try v1beta endpoint
          if (fetchResponse.status === 404) {
            const v1betaUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const v1betaResponse = await fetch(v1betaUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: prompt
                  }]
                }]
              }),
              signal: controller.signal,
            });
            
            if (!v1betaResponse.ok) {
              const v1betaError = await v1betaResponse.json().catch(() => ({}));
              throw new Error(`API request failed: ${v1betaResponse.status} ${v1betaResponse.statusText}. ${JSON.stringify(v1betaError)}`);
            }
            fetchResponse = v1betaResponse;
          }
          
          if (!fetchResponse.ok) {
            let errorData: any = {};
            try {
              errorData = await fetchResponse.json();
            } catch (e) {
              // Ignore JSON parse errors
            }
            throw new Error(`API request failed: ${fetchResponse.status} ${fetchResponse.statusText}. ${JSON.stringify(errorData)}`);
          }
        } catch (fetchErr: any) {
          if (process.env.NODE_ENV === 'development') {
            console.error("Fetch request failed:", fetchErr);
          }
          if (fetchErr instanceof Error) {
            // Check for connection timeout specifically
            if (fetchErr.cause && (fetchErr.cause as any).code === 'UND_ERR_CONNECT_TIMEOUT') {
              throw new Error("Connection timeout: Unable to connect to Gemini API. The connection timed out. This could be due to:\n1. Incorrect API endpoint\n2. Network/DNS issues\n3. API key configuration\n\nPlease check the server logs for more details.");
            }
          }
          throw fetchErr;
        } finally {
          clearTimeout(timeoutId);
        }

        const data = await fetchResponse.json();
        
        // Extract text from response
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          rewrittenText = data.candidates[0].content.parts[0].text.trim();
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.error("Unexpected API response format:", JSON.stringify(data, null, 2));
          }
          throw new Error("Unexpected API response format: " + JSON.stringify(data));
        }
      } catch (fetchError) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Direct HTTP fetch also failed:", fetchError);
        }
        throw fetchError;
      }
    }

    if (!rewrittenText) {
      // If no text returned, return original text
      return NextResponse.json({ 
        rewrittenText: text 
      });
    }

    return NextResponse.json({ 
      rewrittenText: rewrittenText 
    });
  } catch (error) {
    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error("Error rewriting todo text:", error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
    }
    
    // Provide more specific error messages
    let errorMessage = "Failed to rewrite todo text";
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for common Gemini API errors
      if (error.message.includes("API_KEY") || error.message.includes("api key") || error.message.includes("401")) {
        errorMessage = "Invalid Gemini API key. Please verify your API key at https://makersuite.google.com/app/apikey";
      } else if (error.message.includes("quota") || error.message.includes("rate limit") || error.message.includes("429")) {
        errorMessage = "API quota exceeded. Please try again later or check your quota limits.";
      } else if (error.message.includes("safety") || error.message.includes("SAFETY")) {
        errorMessage = "Content was filtered by safety settings. Please try with different text.";
      } else if (error.message.includes("fetch failed") || error.message.includes("network") || error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT") || error.message.includes("Connect Timeout") || error.message.includes("Connection timeout")) {
        errorMessage = error.message.includes("Connection timeout") 
          ? error.message 
          : "Network error: Cannot connect to Gemini API. Connection is timing out, likely due to VPN/network restrictions. Please check your VPN connection or try again later.";
      } else if (error.message.includes("404") || error.message.includes("not found")) {
        errorMessage = "Gemini model not found. The model 'gemini-1.5-flash' might not be available. Please check the model name.";
      } else if (error.message.includes("Cannot reach")) {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

