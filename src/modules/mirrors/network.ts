import { reactive } from '../../engine/reactivity.ts';

interface NetworkInformation {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  type: string;
  addEventListener(type: string, listener: () => void): void;
}

type NavWithConnection = Navigator & { connection?: NetworkInformation; mozConnection?: NetworkInformation; webkitConnection?: NetworkInformation };
const nav: Partial<NavWithConnection> = typeof navigator !== 'undefined' ? navigator as NavWithConnection : {};
const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

const state = reactive({
  effectiveType: connection ? connection.effectiveType : 'unknown',
  downlink: connection ? connection.downlink : 0,
  rtt: connection ? connection.rtt : 0,
  saveData: connection ? connection.saveData : false,
  type: connection ? connection.type : 'unknown'
});

if (connection) {
  connection.addEventListener('change', () => {
    state.effectiveType = connection.effectiveType;
    state.downlink = connection.downlink;
    state.rtt = connection.rtt;
    state.saveData = connection.saveData;
    state.type = connection.type;
  });
}

export const networkMirror = state;
