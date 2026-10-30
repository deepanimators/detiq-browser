const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMS = 1536

// Simple LRU cache — avoids re-embedding identical strings
const cache = new Map<string, number[]>()
const CACHE_MAX = 200

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env['OPENAI_API_KEY']
  if (!apiKey) return null

  const key = text.slice(0, 512) // use truncated text as cache key
  if (cache.has(key)) return cache.get(key)!

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8192) })
    })

    if (!res.ok) return null
    const data = await res.json() as { data: { embedding: number[] }[] }
    const embedding = data.data[0].embedding

    if (cache.size >= CACHE_MAX) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) cache.delete(firstKey)
    }
    cache.set(key, embedding)
    return embedding
  } catch {
    return null
  }
}

export function embeddingToBlob(embedding: number[]): Buffer {
  return Buffer.from(new Float32Array(embedding).buffer)
}

export function blobToEmbedding(blob: Buffer): number[] {
  return Array.from(new Float32Array(blob.buffer, blob.byteOffset, EMBEDDING_DIMS))
}
