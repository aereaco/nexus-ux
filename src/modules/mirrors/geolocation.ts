import { reactive } from '../../engine/reactivity.ts';

/**
 * Geolocation Mirror
 * Triggers watchPosition only when properties are accessed?
 * Vue 3 reactive proxy traps access.
 * If we start watching immediately, we trigger permission prompt.
 * We should allow lazy activation.
 * 
 * We use a specialized object that starts watching on first property access.
 */

let _watchId: number | null = null;
const state = reactive({
  latitude: null as number | null,
  longitude: null as number | null,
  accuracy: null as number | null,
  altitude: null as number | null,
  altitudeAccuracy: null as number | null,
  heading: null as number | null,
  speed: null as number | null,
  timestamp: null as number | null,
  error: null as GeolocationPositionError | null
});

let isActive = false;

const startWatch = () => {
  if (isActive || typeof navigator === 'undefined' || !navigator.geolocation) return;
  isActive = true;
  _watchId = navigator.geolocation.watchPosition(
    (position) => {
      state.latitude = position.coords.latitude;
      state.longitude = position.coords.longitude;
      state.accuracy = position.coords.accuracy;
      state.altitude = position.coords.altitude;
      state.altitudeAccuracy = position.coords.altitudeAccuracy;
      state.heading = position.coords.heading;
      state.speed = position.coords.speed;
      state.timestamp = position.timestamp;
      state.error = null;
    },
    (err) => {
      state.error = err;
    },
    { enableHighAccuracy: true }
  );
};

// Create a proxy that intercepts 'get' to start watching
// But 'state' is already a proxy.
// We wrap it again? Or just use it and rely on manual activation?
// The Spec says "Triggers permission prompt on first access."
// We can use a wrapping Proxy.

export const geolocationMirror = new Proxy(state, {
  get(target, key) {
    if (key !== 'construct' && typeof key !== 'symbol') { // heuristic
      startWatch();
    }
    return Reflect.get(target, key);
  }
});
