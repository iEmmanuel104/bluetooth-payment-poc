// src/lib/hooks/use-bluetooth.ts
import { useState, useEffect } from 'react';
import { BluetoothService } from '../bluetooth/service';
import { Token } from '@/types';

let bluetoothServiceInstance: BluetoothService | null = null;

export function useBluetoothService() {
    const [isConnected, setIsConnected] = useState(false);

    // Create or get the singleton instance
    if (!bluetoothServiceInstance) {
        bluetoothServiceInstance = new BluetoothService();
    }

    useEffect(() => {
        // Set up connection listener
        bluetoothServiceInstance?.on('connectionChange', (connected: boolean) => {
            setIsConnected(connected);
        });
    }, []);

    return {
        isConnected,
        bluetoothService: bluetoothServiceInstance,
        connect: async () => {
            await bluetoothServiceInstance?.connect();
        },
        sendToken: async (token: Token) => {
            await bluetoothServiceInstance?.sendToken(token);
        }
    };
}