// src/lib/bluetooth/service.ts
import { Token } from '@/types';
import { PaymentProtocol } from './protocol';
export interface BluetoothDeviceInfo {
    id: string;
    name: string | null;
    connected: boolean;
}

export interface BluetoothServiceEvents {
    connectionChange: boolean;
    deviceDisconnected: BluetoothDeviceInfo;
}

export class BluetoothService {
    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    private listeners: Map<string, Function[]> = new Map();
    private discoveredDevices: Set<BluetoothDevice> = new Set();

    async connect(): Promise<void> {
        try {
            // Check if Bluetooth is available
            if (!navigator.bluetooth) {
                throw new Error('Bluetooth is not available. Make sure you are using a compatible browser and have enabled the Web Bluetooth API.');
            }

            // Request device with better error handling
            try {
                this.device = await navigator.bluetooth.requestDevice({
                    filters: [{
                        services: [PaymentProtocol.SERVICE_UUID]
                    }],
                    optionalServices: [] // Add any optional services here
                });
            } catch (error) {
                if ((error as Error).name === 'NotFoundError') {
                    throw new Error('No compatible Bluetooth devices found. Make sure your device has Bluetooth enabled and is in range.');
                } else if ((error as Error).name === 'SecurityError') {
                    throw new Error('Bluetooth permission denied. Please allow Bluetooth access when prompted.');
                } else {
                    throw new Error(`Failed to connect: ${(error as Error).message}`);
                }
            }

            // Connect to the device
            try {
                const gattServer = await this.device.gatt?.connect();
                this.server = gattServer ?? null;
                if (!this.server) {
                    throw new Error('Failed to connect to device');
                }
            } catch (error) {
                throw new Error(`Failed to establish GATT connection: ${(error as Error).message}`);
            }

            this.emit('connectionChange', true);
            await this.setupNotifications();

            // Add disconnect listener
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnect();
            });

        } catch (error) {
            this.emit('connectionChange', false);
            throw error;
        }
    }

    private handleDisconnect() {
        this.server = null;
        this.emit('connectionChange', false);
    }

    async disconnect(): Promise<void> {
        if (this.server) {
            this.server.disconnect();
        }
        this.handleDisconnect();
    }

    async sendToken(token: Token): Promise<void> {
        if (!this.server) {
            throw new Error("Not connected to any device");
        }

        const service = await this.server.getPrimaryService(PaymentProtocol.SERVICE_UUID);
        const characteristic = await service.getCharacteristic(
            PaymentProtocol.TOKEN_CHAR_UUID
        );

        const tokenData = PaymentProtocol.encodeToken(token);
        await characteristic.writeValue(tokenData);
    }

    private async setupNotifications(): Promise<void> {
        if (!this.server) return;

        const service = await this.server.getPrimaryService(PaymentProtocol.SERVICE_UUID);
        const characteristic = await service.getCharacteristic(
            PaymentProtocol.TOKEN_CHAR_UUID
        );

        await characteristic.startNotifications();
        characteristic.addEventListener("characteristicvaluechanged", (event) => {
            const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
            if (!value) return;

            const token = PaymentProtocol.decodeToken(value.buffer as ArrayBuffer);
            this.emit("tokenReceived", token);
        });
    }

    async checkAvailability(): Promise<{ available: boolean; enabled: boolean }> {
        try {
            if (!navigator.bluetooth) {
                return { available: false, enabled: false };
            }
            const enabled = await navigator.bluetooth.getAvailability();
            return { available: true, enabled };
        } catch (error) {
            console.error('Error checking Bluetooth availability:', error);
            return { available: false, enabled: false };
        }
    }

    // Start device discovery
    async startScanning(): Promise<BluetoothDeviceInfo[]> {
        try {
            const device = await navigator.bluetooth.requestDevice({
                // Option 1: Accept all devices
                // acceptAllDevices: true,

                // Option 2: Use filters (recommended)
                filters: [{
                    services: [PaymentProtocol.SERVICE_UUID]
                }],
                optionalServices: [] // Add any additional services here
            });

            this.discoveredDevices.add(device);

            // Listen for disconnection
            device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection(device);
            });

            return Array.from(this.discoveredDevices).map(this.deviceToInfo);
        } catch (error) {
            console.error('Error scanning for devices:', error);
            throw error;
        }
    }

    // Get current connection status
    getCurrentDevice(): BluetoothDeviceInfo | null {
        if (!this.device) return null;
        return this.deviceToInfo(this.device);
    }

    // Get list of discovered devices
    getDiscoveredDevices(): BluetoothDeviceInfo[] {
        return Array.from(this.discoveredDevices).map(this.deviceToInfo);
    }

    private deviceToInfo(device: BluetoothDevice): BluetoothDeviceInfo {
        return {
            id: device.id,
            name: device.name || 'Unknown Device',
            connected: device.gatt?.connected || false
        };
    }

    private handleDisconnection(device: BluetoothDevice) {
        this.emit('deviceDisconnected', this.deviceToInfo(device));
        if (device === this.device) {
            this.device = null;
            this.server = null;
            this.emit('connectionChange', false);
        }
    }

    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    private emit(event: string, data: any): void {
        this.listeners.get(event)?.forEach(callback => callback(data));
    }
}
