import { NextRequest } from 'next/server';
import { load } from 'cheerio';
import chromium from '@sparticuz/chromium-min';
import puppeteer, { Browser, Page } from 'puppeteer-core';

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Use the provided Chromium tar file
const chromiumPack = 'https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar';

const isLocal = process.env.IS_LOCAL === 'true' || process.env.VERCEL !== '1';

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
      let executablePath: string | undefined;
      if (isLocal) {
        executablePath = process.env.LOCAL_CHROME_PATH;
        if (!executablePath) {
          throw new Error('LOCAL_CHROME_PATH environment variable must be set for local development when using puppeteer-core.');
        }
      } else {
        executablePath = await chromium.executablePath(chromiumPack);
      }
      console.log('Chromium executable path:', executablePath);
      
      browser = await puppeteer.launch({
        args: isLocal ? puppeteer.defaultArgs() : [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
        ],
        defaultViewport: isLocal ? undefined : chromium.defaultViewport,
        executablePath,
        headless: isLocal ? false : chromium.headless,
      });
    } catch (err) {
      console.error('Error launching browser:', err);
      return new Response(JSON.stringify({ 
        error: 'Error launching browser', 
        details: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      }), { status: 500 });
    }

    let page: Page;
    try {
      page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 45000 
      });
      
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
      return new Response(JSON.stringify({ 
        error: 'Error navigating to page', 
        details: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      }), { status: 500 });
    }

    let html: string;
    try {
      html = await page.content();
      await browser.close();
    } catch (err) {
      console.error('Error extracting HTML:', err);
      await browser.close();
      return new Response(JSON.stringify({ 
        error: 'Error extracting HTML', 
        details: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      }), { status: 500 });
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
      return new Response(JSON.stringify({ 
        error: 'Error calling Gemini API', 
        details: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      }), { status: 500 });
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
    return new Response(JSON.stringify({ 
      error: 'Job info extraction error', 
      details: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    }), { status: 500 });
  }
} 