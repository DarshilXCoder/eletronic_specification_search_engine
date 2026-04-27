import OpenAI from 'openai'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'

function getConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL:
      process.env.GEMINI_BASE_URL || process.env.OPENAI_BASE_URL || GEMINI_BASE_URL,
    braveApiKey: process.env.BRAVE_API_KEY,
    model:
      process.env.GEMINI_MODEL ||
      process.env.OPENAI_MODEL ||
      'gemini-3-flash-preview',
  }
}

function createPrompt(model, brand, category) {
  const details = [
    `Model number: ${model}`,
    brand ? `Brand: ${brand}` : null,
    category ? `Product category: ${category}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `${details}

Find complete product specifications, technical details, variants, release details, and current market pricing.`
}

async function braveSearch(query, braveApiKey) {
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': braveApiKey,
      },
    },
  )

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Brave Search quota exceeded. Try again later.')
    }

    const message = await response.text()
    throw new Error(`Brave Search failed: ${response.status} ${message}`)
  }

  const data = await response.json()
  return (
    data.web?.results?.map((result) => ({
      title: result.title,
      url: result.url,
      description: result.description,
    })) || []
  )
}

export async function handleLookupRequest(input) {
  const { apiKey, baseURL, braveApiKey, model } = getConfig()

  if (!apiKey || !braveApiKey) {
    return {
      status: 400,
      body: {
        error:
          'Missing API keys. Set GEMINI_API_KEY (or OPENAI_API_KEY) and BRAVE_API_KEY in your environment.',
      },
    }
  }

  const modelNumber = `${input?.model || ''}`.trim()
  const brand = `${input?.brand || ''}`.trim()
  const category = `${input?.category || ''}`.trim()

  if (!modelNumber) {
    return {
      status: 400,
      body: { error: 'Model number is required.' },
    }
  }

  const openai = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  })

  const messages = [
    {
      role: 'system',
      content: `You are an expert electronics research assistant. When given a model number (and optionally a brand and product type), your job is to find and present comprehensive, accurate information about that product.

Use the brave_search tool to search the web. Search multiple times if needed, for example:
- Search 1: Full technical specifications
- Search 2: Current market pricing across retailers
- Search 3: Key features, release date, variants

Once you have enough information, respond in well-structured Markdown with the following sections:

## [Product Name] - [Model Number]

### Overview
Brief description, release year, market segment.

### Technical Specifications
Full spec table in markdown format (processor, display, battery, dimensions, weight, connectivity, etc. relevant to product category).

### Key Features
Bullet list of standout features.

### Pricing & Availability
Current pricing from major retailers (Amazon, Flipkart, official store, etc.). Include approximate INR and USD if available.

### Variants & Configurations
List available colors, storage options, regional variants if applicable.

### Verdict
2-3 line summary of who this product is for.

---
*Data sourced via live web search. Prices may vary.*

If you cannot find sufficient information, say so clearly.`,
    },
    {
      role: 'user',
      content: createPrompt(modelNumber, brand, category),
    },
  ]

  const tools = [
    {
      type: 'function',
      function: {
        name: 'brave_search',
        description:
          'Search the web using Brave Search API to find electronics specifications, technical details, and market pricing.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query string',
            },
          },
          required: ['query'],
        },
      },
    },
  ]

  try {
    for (let toolCalls = 0; toolCalls < 6; toolCalls += 1) {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: 'auto',
      })

      const choice = completion.choices[0]?.message
      if (!choice) {
        break
      }

      if (!choice.tool_calls?.length) {
        return {
          status: 200,
          body: {
            markdown: choice.content?.trim() || `No results found for "${modelNumber}".`,
          },
        }
      }

      messages.push(choice)

      for (const toolCall of choice.tool_calls) {
        if (toolCall.function.name !== 'brave_search') {
          continue
        }

        const parsedArgs = JSON.parse(toolCall.function.arguments || '{}')
        const searchResults = await braveSearch(parsedArgs.query || modelNumber, braveApiKey)

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(searchResults),
        })
      }
    }

    const fallback = await openai.chat.completions.create({
      model,
      messages: [
        ...messages,
        {
          role: 'system',
          content:
            'Stop using tools. Produce the best final markdown answer with the information already gathered.',
        },
      ],
    })

    return {
      status: 200,
      body: {
        markdown:
          fallback.choices[0]?.message?.content?.trim() ||
          `No results found for "${modelNumber}".`,
      },
    }
  } catch (error) {
    return {
      status: 500,
      body: {
        error: error instanceof Error ? error.message : 'Lookup failed.',
      },
    }
  }
}
