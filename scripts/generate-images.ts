import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateImage(prompt: string, filename: string) {
  try {
    console.log(`Generating ${filename}...`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        const dir = path.join(process.cwd(), 'public', 'images');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), buffer);
        console.log(`Saved ${filename}`);
        return;
      }
    }
    console.log(`Failed to generate ${filename}: No inlineData found`);
  } catch (e) {
    console.error(`Error generating ${filename}:`, e);
  }
}

async function main() {
  const basePrompt = "A hyper-realistic, world-class beauty editorial portrait of a gorgeous woman with a rich chocolate complexion, flawless glowing skin. Luxury skincare aesthetic, soft studio lighting, neutral background. Same face identity.";
  
  await Promise.all([
    generateImage(`${basePrompt} She has elegant curly hair, looking softly at the camera.`, 'model-curly.jpg'),
    generateImage(`${basePrompt} She has sleek straight hair, smiling warmly and radiantly.`, 'model-straight-smiling.jpg'),
    generateImage(`${basePrompt} She has beautiful braided hair, elegant pose, serene expression.`, 'model-braids.jpg')
  ]);
}

main();
