// Global singleton location tracker for bus sharing across pages
import { postBusLocation } from './busLocationService'

let watchId = null
let currentBusId = null
let shareEnabled = false
let lastPos = null // { lat, lng, at }
const subscribers = new Set()
let mounted = true

function notify() {
  subscribers.forEach((cb) => {
    try { cb(getState()) } catch {}
  })
}

export function getState() {
  return { running: !!watchId, currentBusId, shareEnabled, lastPos }
}

export function subscribe(callback) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

export function setShare(enabled) {
  shareEnabled = !!enabled
  try { localStorage.setItem('bus_share_live', shareEnabled ? '1' : '0') } catch {}
}

export async function start(busId) {
  if (!navigator.geolocation) throw new Error('Geolocation no soportado')
  currentBusId = busId
  mounted = true
  // if already watching, restart for new busId
  if (watchId != null) {
    try { navigator.geolocation.clearWatch(watchId) } catch {}
    watchId = null
  }
  // First fix
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p),
        (e) => reject(e),
        { enableHighAccuracy: false, maximumAge: 10000, timeout: 30000 },
      )
    })
    const lat = pos.coords.latitude
    const lng = pos.coords.longitude
    lastPos = { lat, lng, at: Date.now() }
    notify()
    if (shareEnabled && currentBusId) {
      postBusLocation({ idBus: currentBusId, latitud: lat, longitud: lng, timestamp: lastPos.at }).catch(() => {})
    }
  } catch (_) {
    // ignore; continue to watch for future updates
  }

  // Watch
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      lastPos = { lat, lng, at: Date.now() }
      if (mounted) notify()
      if (shareEnabled && currentBusId) {
        postBusLocation({ idBus: currentBusId, latitud: lat, longitud: lng, timestamp: lastPos.at }).catch(() => {})
      }
    },
    (_err) => {
      // Optionally: could notify error subscribers
    },
    { enableHighAccuracy: false, maximumAge: 10000, timeout: 30000 },
  )
  notify()
}

export function stop() {
  if (watchId != null) {
    try { navigator.geolocation.clearWatch(watchId) } catch {}
    watchId = null
  }
  mounted = false
  notify()
}

// Initialize share flag from localStorage
try { shareEnabled = localStorage.getItem('bus_share_live') === '1' } catch {}
