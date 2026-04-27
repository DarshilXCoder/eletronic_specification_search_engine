export interface LookupRequestInput {
  model?: string
  brand?: string
  category?: string
}

export interface LookupResponse {
  status: number
  body:
    | {
        markdown: string
      }
    | {
        error: string
      }
}

export function handleLookupRequest(input: LookupRequestInput): Promise<LookupResponse>
