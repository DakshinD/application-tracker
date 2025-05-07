import { NextRequest } from 'next/server';
import { load } from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer-core';

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Function to get the correct Chrome executable path
async function getChromePath() {
  if (process.env.VERCEL) {
    // In Vercel, we need to use the system Chrome
    return '/usr/bin/google-chrome';
  } else if (process.platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    return '/usr/bin/google-chrome';
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid URL' }), { status: 400 });
    }
    try {
      new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Malformed URL' }), { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Gemini API key' }), { status: 500 });
    }

    let browser: Browser;
    try {
      const executablePath = await getChromePath();
      
      browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
        ],
        executablePath,
        headless: true,
      });
    } catch (err) {
      console.error('Error launching browser:', err);
      return new Response(JSON.stringify({ error: 'Error launching browser', details: err instanceof Error ? err.message : String(err) }), { status: 500 });
    }

    let page: Page;
    try {
      page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
      // Wait for DOMContentLoaded and a minimum of 1s, but no more than 5s total
      await Promise.race([
        page.evaluate(() => new Promise(resolve => {
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(resolve, 1000); // minimum 1s
          } else {
            window.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 1000), { once: true });
          }
        })),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
    } catch (err) {
      console.error('Error navigating to page:', err);
      await browser.close();
      return new Response(JSON.stringify({ error: 'Error navigating to page', details: err instanceof Error ? err.message : String(err) }), { status: 500 });
    }

    let html: string;
    try {
      html = await page.content();
      await browser.close();
    } catch (err) {
      console.error('Error extracting HTML:', err);
      await browser.close();
      return new Response(JSON.stringify({ error: 'Error extracting HTML', details: err instanceof Error ? err.message : String(err) }), { status: 500 });
    }

    const $ = load(html);
    const text = $('body').text();

    // Prompt for Gemini API
    const prompt = `Extract the company name, job title, and location from this job posting. Return a JSON object with keys: company, jobTitle, location.\n\n${text.slice(0, 4000)}`;
    console.log('Gemini prompt:', prompt);

    let geminiData: unknown;
    try {
      const geminiRes = await fetch(`${GEMINI_API_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      });
      geminiData = await geminiRes.json();
      console.log('Gemini API raw response:', JSON.stringify(geminiData));
    } catch (err) {
      console.error('Error calling Gemini API:', err);
      return new Response(JSON.stringify({ error: 'Error calling Gemini API', details: err instanceof Error ? err.message : String(err) }), { status: 500 });
    }

    // Extract the JSON from the markdown code block in the Gemini response
    let jobInfo: unknown;
    try {
      let textContent: string | undefined;
      if (
        typeof geminiData === 'object' && geminiData !== null &&
        'candidates' in geminiData &&
        Array.isArray((geminiData as Record<string, unknown>).candidates)
      ) {
        const candidates = (geminiData as Record<string, unknown>).candidates as unknown[];
        if (candidates.length > 0) {
          const content = (candidates[0] as Record<string, unknown>).content;
          if (content && typeof content === 'object' && 'parts' in content && Array.isArray((content as Record<string, unknown>).parts)) {
            const parts = (content as Record<string, unknown>).parts as unknown[];
            if (parts.length > 0 && typeof parts[0] === 'object' && parts[0] !== null && 'text' in parts[0]) {
              textContent = (parts[0] as Record<string, unknown>).text as string;
            }
          }
        }
      }
      if (textContent) {
        // Extract JSON from markdown code block
        const match = textContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          jobInfo = JSON.parse(match[1]);
        } else {
          // Try to parse as plain JSON if not in code block
          jobInfo = JSON.parse(textContent);
        }
      } else {
        jobInfo = geminiData;
      }
      console.log('Parsed jobInfo:', JSON.stringify(jobInfo));
    } catch {
      console.error('Failed to parse Gemini response:', geminiData);
      return new Response(JSON.stringify({ error: 'Failed to parse Gemini response', details: geminiData }), { status: 500 });
    }

    return new Response(JSON.stringify(jobInfo), { status: 200 });
  } catch (err: unknown) {
    console.error('Job info extraction error:', err);
    return new Response(JSON.stringify({ error: 'Job info extraction error', details: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
} 