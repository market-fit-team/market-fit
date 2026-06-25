export const fetchPublicMarketApi = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Market API request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}
