// src/lib/bluetooth/service.ts
import { Token } from '@/types';
import { PaymentProtocol } from './protocol';

export class BluetoothService {
    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    private listeners: Map<string, Function[]> = new Map();

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
