import { reactive } from '../../engine/reactivity.ts';

const state = reactive({
  charging: false,
  chargingTime: 0,
  dischargingTime: 0,
  level: 1,
  isSupported: false
});

// Setup battery listener
interface BatteryManager {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(type: string, listener: () => void): void;
}

// Setup battery listener
type NavigatorWithBattery = Navigator & { getBattery?: () => Promise<BatteryManager> };

const nav = typeof navigator !== 'undefined' ? navigator as NavigatorWithBattery : undefined;
if (nav && nav.getBattery) {
  nav.getBattery().then((battery: BatteryManager) => {
    state.isSupported = true;

    const update = () => {
      state.charging = battery.charging;
      state.chargingTime = battery.chargingTime;
      state.dischargingTime = battery.dischargingTime;
      state.level = battery.level;
    };

    update();

    battery.addEventListener('chargingchange', update);
    battery.addEventListener('chargingtimechange', update);
    battery.addEventListener('dischargingtimechange', update);
    battery.addEventListener('levelchange', update);
  });
}

export const batteryMirror = state;
