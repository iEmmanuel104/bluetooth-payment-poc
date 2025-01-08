// src/types/bluetooth.d.ts
interface Window {
    bluetooth: Bluetooth;
}

interface Navigator {
    bluetooth: Bluetooth;
}

interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
    getAvailability(): Promise<boolean>;
}

interface RequestDeviceOptions {
    filters: Array<{
        services?: BluetoothServiceUUID[];
        name?: string;
        namePrefix?: string;
        manufacturerId?: number;
        serviceData?: { [key: string]: DataView };
    }>;
    optionalServices?: BluetoothServiceUUID[];
    acceptAllDevices?: boolean;
}