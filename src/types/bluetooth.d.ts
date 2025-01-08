// src/types/bluetooth.d.ts
declare interface Window {
    bluetooth: {
        getAvailability(): Promise<boolean>;
        requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
    }
}

declare interface Navigator {
    bluetooth: {
        getAvailability(): Promise<boolean>;
        requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
    }
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