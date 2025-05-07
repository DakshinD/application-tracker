import { NextRequest } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return new Response(JSON.stringify({ error: 'Missing URL' }), { status: 400 });

  try {
    // 1. Fetch HTML
    const { data: html } = await axios.get(url);
    // 2. Extract text
    const $ = cheerio.load(html);
    const text = $('body').text();
    
    // Add debug logging for API key
    console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
    
    // 3. Call Gemini API
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Extract the company name, job title, and location from this job posting text. Respond in JSON: {"company": "...", "jobTitle": "...", "location": "..."}\n\n${text}`
            }]
          }]
        })
      }
    );

    // Add debug logging for response
    console.log('Gemini API Status:', geminiRes.status);
    const geminiData = await geminiRes.json();
    console.log('Gemini API Response:', JSON.stringify(geminiData, null, 2));

    // Try to parse the JSON from the LLM response
    let extracted = {};
    try {
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

    // Only include a small portion of the HTML in the debug info
    const debugHtml = typeof html === 'string' ? html.slice(0, 1000) : 'HTML not available';
    
    return new Response(JSON.stringify({ 
      ...extracted, 
      _debug: { 
        html: debugHtml, 
        geminiData 
      } 
    }), { status: 200 });
  } catch (err: unknown) {
    console.error('Job info extraction error:', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch or parse job posting.', 
      details: err instanceof Error ? err.message : String(err),
      _debug: { 
        hasApiKey: !!process.env.GEMINI_API_KEY,
        apiKeyLength: process.env.GEMINI_API_KEY?.length
      }
    }), { status: 500 });
  }
} 