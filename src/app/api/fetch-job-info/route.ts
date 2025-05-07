import { NextRequest } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return new Response(JSON.stringify({ error: 'Missing URL' }), { status: 400 });

  try {
    let html: string;
    
    // Use Puppeteer to fetch the page
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Set a shorter timeout for navigation
      await page.setDefaultNavigationTimeout(10000);
      
      // Navigate and wait for network to be idle
      await page.goto(url, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 10000 
      });
      
      // Wait for any job-related content to be visible
      await Promise.race([
        page.waitForSelector('h1, .job-title, .job-description, .job-details', { timeout: 5000 }),
        page.waitForSelector('body', { timeout: 5000 }) // Fallback to just waiting for body
      ]).catch(() => {}); // Ignore timeout errors
      
      // Get the rendered HTML
      html = await page.content();
    } finally {
      await browser.close();
    }

    console.log('HTML length:', html.length);
    
    // Extract text
    const $ = cheerio.load(html);
    const text = $('body').text();
    console.log('Extracted text length:', text.length);
    console.log('First 200 chars of text:', text.slice(0, 200));
    
    // Call Gemini API with a more specific prompt
    const prompt = `Extract the company name, job title, and location from this job posting text. Look for these specific patterns:
    - Company name is usually in the header or near the job title
    - Job title is typically in a large heading
    - Location is often listed as "Location" or "Workplace Type"
    Respond in JSON format: {"company": "...", "jobTitle": "...", "location": "..."}\n\n${text}`;
    
    console.log('Prompt length:', prompt.length);
    
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    );

    const geminiData = await geminiRes.json();
    console.log('Gemini API Response:', JSON.stringify(geminiData, null, 2));
    
    // Try to parse the JSON from the LLM response
    let extracted = {};
    try {
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('Content from Gemini:', content);
      
      // Remove the ```json and ``` markers if they exist
      const cleanContent = content.replace(/```json\n|\n```/g, '');
      const match = cleanContent.match(/\{[\s\S]*?\}/);
      if (match) {
        extracted = JSON.parse(match[0]);
      } else {
        throw new Error('No JSON object found in Gemini response');
      }
    } catch (e) {
      console.error('Parse error:', e);
      extracted = { error: 'Could not parse Gemini response', raw: geminiData };
    }

    return new Response(JSON.stringify({ 
      ...extracted, 
      _debug: { 
        textLength: text.length,
        promptLength: prompt.length,
        geminiData 
      } 
    }), { status: 200 });
  } catch (err: unknown) {
    console.error('Job info extraction error:', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch or parse job posting.', 
      details: err instanceof Error ? err.message : String(err)
    }), { status: 500 });
  }
} 