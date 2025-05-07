import { NextRequest } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return new Response(JSON.stringify({ error: 'Missing URL' }), { status: 400 });

  try {
    // 1. Fetch HTML
    const { data: html } = await axios.get(url);
    console.log('HTML length:', html.length);
    
    // 2. Extract text
    const $ = cheerio.load(html);
    const text = $('body').text();
    console.log('Extracted text length:', text.length);
    console.log('First 200 chars of text:', text.slice(0, 200));
    
    // 3. Call Gemini API
    const prompt = `Extract the company name, job title, and location from this job posting text. Respond in JSON: {"company": "...", "jobTitle": "...", "location": "..."}\n\n${text}`;
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