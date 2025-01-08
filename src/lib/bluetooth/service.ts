// lib/bluetooth/service.ts
import { Token } from "@/types";
import { PaymentProtocol } from "./protocol";

export class BluetoothService {
    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    private listeners: Map<string, Function[]> = new Map();

    async connect(): Promise<void> {
        try {
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{
                    services: [PaymentProtocol.SERVICE_UUID]
                }]
            });

            const gatt = this.device.gatt;
            if (!gatt) {
                throw new Error("GATT server not found");
            }
            this.server = await gatt.connect();
            if (!this.server) {
                throw new Error("Failed to connect to device");
            }

            this.emit("connectionChange", true);
            this.setupNotifications();
        } catch (error) {
            this.emit("connectionChange", false);
            throw error;
        }
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
