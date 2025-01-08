import { BluetoothDeviceInfo } from "@/lib/bluetooth/service";

// src/types/bluetooth.ts
export enum PairingRole {
    EMITTER = 'emitter',
    RECEIVER = 'receiver',
    NONE = 'none'
}

export interface PairingState {
    role: PairingRole;
    isAdvertising: boolean;
    isPairing: boolean;
    connectedDevice: BluetoothDeviceInfo | null;
}