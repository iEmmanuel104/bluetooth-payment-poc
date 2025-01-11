// lib/bluetooth/service.ts
import { Token } from '@/types';
import { PaymentProtocol } from './protocol';
import { PairingRole } from '@/types/bluetooth';

export interface BluetoothDeviceInfo {
    id: string;
    name: string | null;
    connected: boolean;
    role?: PairingRole;
}

export class BluetoothService {
    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    private listeners: Map<string, Function[]> = new Map();
    private discoveredDevices: Set<BluetoothDevice> = new Set();
    private currentRole: PairingRole = PairingRole.NONE;
    private advertising: boolean = false;

    constructor() {
        // Try to restore role from localStorage
        const savedRole = localStorage.getItem('bluetoothRole') as PairingRole;
        if (savedRole) {
            this.currentRole = savedRole;
        }
    }

    // Make tryReconnect public
    public async tryReconnect(): Promise<void> {
        const lastDeviceId = localStorage.getItem('lastConnectedDevice');
        if (lastDeviceId && this.currentRole === PairingRole.EMITTER) {
            try {
                // Check if the device is in discoveredDevices
                const device = Array.from(this.discoveredDevices)
                    .find(d => d.id === lastDeviceId);

                if (device) {
                    await this.connectToDevice(lastDeviceId);
                } else {
                    // If device not found, we need to scan first
                    await this.startScanning();
                    await this.connectToDevice(lastDeviceId);
                }
            } catch (error) {
                console.warn('Failed to reconnect to last device:', error);
                throw error;
            }
        }
    }

    // Start advertising as a receiver
    async advertiseAsReceiver(): Promise<void> {
        try {
            if (!navigator.bluetooth) {
                throw new Error('Bluetooth is not available');
            }
            // Set a recognizable name for development
            // Note: This is not supported in all browsers
            if ('setName' in navigator.bluetooth) {
                await (navigator.bluetooth as any).setName("BT-Pay-Receiver");
            }

            this.currentRole = PairingRole.RECEIVER;
            this.advertising = true;

            // Set up GATT server for incoming connections
            // Note: Web Bluetooth API currently doesn't support peripheral mode
            // This is a limitation of the current API

            this.emit('roleChange', PairingRole.RECEIVER);

            // Set up notifications for incoming connections
            await this.setupPaymentReceiver();

        } catch (error) {
            console.error('Error starting as receiver:', error);
            this.currentRole = PairingRole.NONE;
            this.advertising = false;
            this.emit('roleChange', PairingRole.NONE);
            throw error;
        }
    }

    // Start as emitter and scan for devices
    async startAsEmitter(): Promise<void> {
        console.log('Starting as emitter...');
        try {
            this.currentRole = PairingRole.EMITTER;
            this.emit('roleChange', PairingRole.EMITTER);
            this.discoveredDevices.clear();

            // Start scanning is now called separately
            // This allows more control over when to scan
        } catch (error) {
            console.error('Error starting as emitter:', error);
            this.currentRole = PairingRole.NONE;
            this.emit('roleChange', PairingRole.NONE);
            throw error;
        }
    }

    
    // Start scanning for devices
    async startScanning(): Promise<BluetoothDeviceInfo[]> {
        const DEV_MODE = true;
        if (!navigator.bluetooth) {
            throw new Error('Bluetooth is not available');
        }

        if (this.currentRole !== PairingRole.EMITTER) {
            throw new Error('Must be in emitter mode to scan for devices');
        }

        try {
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    PaymentProtocol.SERVICE_UUID,
                    PaymentProtocol.TOKEN_CHAR_UUID,
                    PaymentProtocol.APPROVAL_CHAR_UUID
                ]
            });

            console.log("Found device:", {
                name: device.name,
                id: device.id,
                gatt: device.gatt
            });

            // Ensure we're still in emitter mode
            if (this.currentRole !== PairingRole.EMITTER) {
                throw new Error('Role changed during scanning');
            }

            this.discoveredDevices.add(device);

            const deviceInfo = this.deviceToInfo(device);
            this.emit('deviceDiscovered', deviceInfo);

            return Array.from(this.discoveredDevices).map(d => this.deviceToInfo(d));
        } catch (error) {
            console.error('Error scanning for devices:', error);
            throw error;
        }
    }


    // Connect to a specific device
    async connectToDevice(deviceId: string): Promise<void> {
        if (this.currentRole !== PairingRole.EMITTER) {
            throw new Error('Must be in emitter mode to connect to devices');
        }

        const device = Array.from(this.discoveredDevices)
            .find(d => d.id === deviceId);

        if (!device) {
            throw new Error('Device not found');
        }

        try {
            this.device = device;
            const gattServer = await device.gatt?.connect();
            this.server = gattServer ?? null;

            if (!this.server) {
                throw new Error('Failed to connect to GATT server');
            }

            // Set up services and characteristics
            if (!this.server) {
                throw new Error('GATT server is not connected');
            }
            if (!this.server) {
                throw new Error('GATT server is not connected');
            }
            if (!this.server) {
                throw new Error('GATT server is not connected');
            }
            if (!this.server) {
                throw new Error('GATT server is not connected');
            }
            const service = await this.server.getPrimaryService(PaymentProtocol.SERVICE_UUID);
            await service.getCharacteristic(PaymentProtocol.TOKEN_CHAR_UUID);

            this.emit('connectionChange', true);

            // Set up disconnect listener
            device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection(device);
            });
        } catch (error) {
            console.error('Error connecting to device:', error);
            this.device = null;
            this.server = null;
            throw error;
        }
    }

    private async setupPaymentReceiver(): Promise<void> {
        if (!this.server) {
            throw new Error('GATT Server not available for payment receiver setup');
        }
        try {
            const service = await this.server.getPrimaryService(PaymentProtocol.SERVICE_UUID);
            const characteristic = await service.getCharacteristic(PaymentProtocol.TOKEN_CHAR_UUID);

            // Start notifications
            await characteristic.startNotifications();

            // Listen for value changes
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
                const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
                if (!value) return;

                try {
                    const token = PaymentProtocol.decodeToken(value.buffer as ArrayBuffer);
                    console.log('Payment received:', token);
                    this.emit('paymentReceived', token);
                } catch (error) {
                    console.error('Error processing received payment:', error);
                }
            });

            console.log('Payment receiver setup complete');
        } catch (error) {
            console.error('Error setting up payment receiver:', error);
            throw error;
        }
    }

    async acknowledgePayment(token: Token): Promise<void> {
        if (!this.server || this.currentRole !== PairingRole.RECEIVER) {
            throw new Error('Not in receiver mode or not connected');
        }

        try {
            const service = await this.server.getPrimaryService(PaymentProtocol.SERVICE_UUID);
            const characteristic = await service.getCharacteristic(PaymentProtocol.APPROVAL_CHAR_UUID);

            const ack = {
                tokenId: token.id,
                status: 'received',
                timestamp: Date.now()
            };

            await characteristic.writeValue(
                new TextEncoder().encode(JSON.stringify(ack))
            );
        } catch (error) {
            console.error('Error acknowledging payment:', error);
            throw error;
        }
    }

    // Send a token to the connected device
    async sendToken(token: Token): Promise<void> {
        if (!this.server) {
            throw new Error('Not connected to any device');
        }

        if (this.currentRole !== PairingRole.EMITTER) {
            throw new Error('Must be in emitter mode to send tokens');
        }

        try {
            const service = await this.server.getPrimaryService(PaymentProtocol.SERVICE_UUID);
            const characteristic = await service.getCharacteristic(PaymentProtocol.TOKEN_CHAR_UUID);

            // Encode token
            const tokenData = PaymentProtocol.encodeToken(token);
            const dataArray = new Uint8Array(tokenData);

            // Split data into chunks
            const chunks = [];
            for (let i = 0; i < dataArray.length; i += PaymentProtocol.MAX_CHUNK_SIZE) {
                chunks.push(dataArray.slice(i, i + PaymentProtocol.MAX_CHUNK_SIZE));
            }

            console.log(`Sending data in ${chunks.length} chunks`);

            // Send chunks with delay between each
            for (let i = 0; i < chunks.length; i++) {
                console.log(`Sending chunk ${i + 1}/${chunks.length}, size: ${chunks[i].length} bytes`);
                await characteristic.writeValue(chunks[i]);
                // Small delay between chunks
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            console.log('All chunks sent successfully');

            // Verify if possible
            if (characteristic.properties.read) {
                try {
                    const readValue = await characteristic.readValue();
                    console.log('Read back value:', new TextDecoder().decode(readValue.buffer as ArrayBuffer));
                } catch (readError) {
                    console.warn('Could not verify write:', readError);
                }
            }
        } catch (error) {
            console.error('Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                name: error instanceof Error ? error.name : 'Unknown',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw new Error(`Failed to send payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Add this method to BluetoothService for testing
    async testWrite(): Promise<void> {
        if (!this.server) {
            throw new Error('Not connected to any device');
        }

        try {
            const service = await this.server.getPrimaryService(PaymentProtocol.SERVICE_UUID);
            const characteristic = await service.getCharacteristic(PaymentProtocol.TOKEN_CHAR_UUID);

            // Test with a tiny payload
            const testData = new Uint8Array([1, 2, 3, 4, 5]);
            console.log('Sending test data...');
            await characteristic.writeValue(testData);
            console.log('Test write successful');
        } catch (error) {
            console.error('Test write failed:', error);
            throw error;
        }
    }

    // Reset current role and disconnect
    async resetRole(): Promise<void> {
        await this.disconnect();
        this.currentRole = PairingRole.NONE;
        this.advertising = false;
        this.emit('roleChange', PairingRole.NONE);
    }

    // Get current role
    getCurrentRole(): PairingRole {
        return this.currentRole;
    }

    // Check Bluetooth availability
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

    // Event handling methods
    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    off(event: string, callback: Function): void {
        const listeners = this.listeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    private emit(event: string, data: any): void {
        const listeners = this.listeners.get(event) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} listener:`, error);
            }
        });
    }

    private handleDisconnection(device: BluetoothDevice): void {
        this.emit('deviceDisconnected', this.deviceToInfo(device));
        if (device === this.device) {
            this.device = null;
            this.server = null;
            this.emit('connectionChange', false);
        }
    }

    private deviceToInfo(device: BluetoothDevice): BluetoothDeviceInfo {
        return {
            id: device.id,
            name: device.name || 'Unknown Device',
            connected: device.gatt?.connected || false,
            role: this.currentRole || PairingRole.NONE  // Provide default value
        };
    }


    // Cleanup method
    async disconnect(): Promise<void> {
        if (this.server) {
            this.server.disconnect();
        }
        this.device = null;
        this.server = null;
        localStorage.removeItem('lastConnectedDevice');
        localStorage.removeItem('bluetoothConnected');
        this.emit('connectionChange', false);
    }
}