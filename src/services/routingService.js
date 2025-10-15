// Simple routing helper using OSRM public demo server. For production, host your own OSRM or use a paid provider.
// Input: points = Array<[lat, lng]>
// Output: Array<[lat, lng]> representing a snapped path following streets, or [] on failure.
export async function osrmRoute(points) {
  try {
    const coords = (Array.isArray(points) ? points : []).filter(p => Array.isArray(p) && p.length === 2)
    if (coords.length < 2) return []
    // OSRM expects lon,lat;lon,lat ...
    const path = coords.map(([lat, lng]) => `${lng},${lat}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`;
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    const geom = data?.routes?.[0]?.geometry?.coordinates
    if (!Array.isArray(geom)) return []
    // Convert [lng,lat] -> [lat,lng]
    return geom.map(([lng, lat]) => [lat, lng])
  } catch (_) {
    return []
  }
}
