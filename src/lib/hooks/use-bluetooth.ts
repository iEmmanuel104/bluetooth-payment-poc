// src/lib/hooks/use-bluetooth.ts
import { useState, useEffect } from 'react';
import { BluetoothService } from '../bluetooth/service';
import { PairingRole } from '@/types/bluetooth';
import { OfflineToken } from '../blockchain/types';

// Store the singleton instance outside of the component
let bluetoothServiceInstance: BluetoothService | null = null;

export function useBluetoothService() {
    const [isConnected, setIsConnected] = useState(false);
    const [currentRole, setCurrentRole] = useState<PairingRole>(PairingRole.NONE);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        // Create the singleton instance only on the client side
        if (!bluetoothServiceInstance) {
            bluetoothServiceInstance = new BluetoothService();
        }

        const onConnectionChange = (connected: boolean) => {
            console.log('Connection changed:', connected);
            setIsConnected(connected);
        };

        const onRoleChange = (role: PairingRole) => {
            console.log('Role changed:', role);
            setCurrentRole(role);
        };

        // Set initial role from service
        if (bluetoothServiceInstance) {
            setCurrentRole(bluetoothServiceInstance.getCurrentRole());
        }

        bluetoothServiceInstance.on('connectionChange', onConnectionChange);
        bluetoothServiceInstance.on('roleChange', onRoleChange);

        return () => {
            if (bluetoothServiceInstance) {
                bluetoothServiceInstance.off('connectionChange', onConnectionChange);
                bluetoothServiceInstance.off('roleChange', onRoleChange);
            }
        };
    }, [isClient]);

    // Return null or default values during SSR
    if (!isClient) {
        return {
            isConnected: false,
            currentRole: PairingRole.NONE,
            bluetoothService: null,
            sendToken: async () => {
                throw new Error('Bluetooth not available during server-side rendering');
            }
        };
    }

    // Return actual values on client side
    return {
        isConnected,
        currentRole,
        bluetoothService: bluetoothServiceInstance,
        sendToken: async (token: OfflineToken) => {
            if (!bluetoothServiceInstance) {
                throw new Error('Bluetooth service not initialized');
            }
            await bluetoothServiceInstance.sendToken(token);
        }
    };
}