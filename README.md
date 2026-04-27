# SPECLOOKUP

Electronics research UI using Gemini through the OpenAI SDK and Brave Search.

## Local development

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
BRAVE_API_KEY=your_brave_api_key
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
```

Run one command:

```bash
npm run dev
```

Vite serves both:

- the React frontend
- the local `/api/lookup` endpoint

The frontend calls `/api/lookup` with a relative URL, so local dev and deployed behavior match.

## Vercel deployment

This project is structured for Vercel:

- `api/lookup.js` is the serverless API route
- `dist/` is the frontend build output

Set these Vercel environment variables:

- `GEMINI_API_KEY`
- `BRAVE_API_KEY`
- `GEMINI_MODEL` optional
- `GEMINI_BASE_URL` optional

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```
