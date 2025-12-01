import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    // Read the prompt file
    const filePath = join(process.cwd(), "src", "lib", "prompts", "rewrite-todo-prompt.txt");
    const prompt = await readFile(filePath, "utf-8");
    
    return new NextResponse(prompt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error reading prompt file:", error);
    }
    // Return default prompt if file doesn't exist
    return new NextResponse(
      "Rewrite the following todo item to be clear and concise. Keep the essential meaning but make it more direct and actionable. Return only the rewritten text, nothing else.\n\nOriginal: {text}\n\nRewritten:\n",
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      }
    );
  }
}

