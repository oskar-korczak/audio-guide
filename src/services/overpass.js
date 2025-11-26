// overpass.js - Overpass API client for querying tourist attractions

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

/**
 * Fetch attractions from Overpass API
 * @param {Object} bounds - Bounding box {south, west, north, east}
 * @param {AbortSignal} signal - AbortController signal for cancellation
 * @returns {Promise<Object>} Raw Overpass response
 */
export async function fetchAttractions(bounds, signal) {
  const { south, west, north, east } = bounds;

  const query = `
    [out:json][timeout:25];
    (
      nwr["tourism"~"museum|attraction|gallery|viewpoint|artwork|information"](${south},${west},${north},${east});
      nwr["historic"](${south},${west},${north},${east});
      nwr["amenity"="place_of_worship"](${south},${west},${north},${east});
    );
    out center;
  `;

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `data=${encodeURIComponent(query)}`,
    signal
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    if (response.status === 504) {
      throw new Error('TIMEOUT');
    }
    throw new Error(`Overpass API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch attractions with retry logic for rate limiting
 * @param {Object} bounds - Bounding box
 * @param {AbortSignal} signal - AbortController signal
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Object>} Raw Overpass response
 */
export async function fetchAttractionsWithRetry(bounds, signal, attempt = 0) {
  try {
    return await fetchAttractions(bounds, signal);
  } catch (error) {
    if (error.message === 'RATE_LIMITED' && attempt < MAX_RETRIES) {
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
      return fetchAttractionsWithRetry(bounds, signal, attempt + 1);
    }
    throw error;
  }
}

/**
 * Determine attraction category from OSM tags
 * @param {Object} tags - OSM tags
 * @returns {string} Category string
 */
function getCategory(tags) {
  if (tags.tourism) return tags.tourism;
  if (tags.historic) return `historic:${tags.historic}`;
  if (tags.amenity === 'place_of_worship') return 'place_of_worship';
  return 'attraction';
}

/**
 * Transform raw Overpass response to Attraction objects
 * @param {Object} response - Raw Overpass response
 * @returns {Array<Object>} Array of Attraction objects
 */
export function transformAttractions(response) {
  return response.elements
    .filter(el => el.tags?.name) // Must have name
    .map(el => ({
      id: el.id,
      type: el.type,
      name: el.tags.name,
      latitude: el.lat ?? el.center?.lat,
      longitude: el.lon ?? el.center?.lon,
      category: getCategory(el.tags),
      tags: el.tags
    }))
    .filter(a => a.latitude && a.longitude); // Must have coordinates
}
