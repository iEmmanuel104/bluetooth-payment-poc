// src/lib/hooks/use-bluetooth.ts
import { useState, useEffect } from 'react';
import { BluetoothService } from '../bluetooth/service';
import { PairingRole } from '@/types/bluetooth';
import { OfflineToken } from '../blockchain/types';

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

        // Create or get the singleton instance
        if (!bluetoothServiceInstance) {
            bluetoothServiceInstance = new BluetoothService();
        }

        // Set up event listeners
        const onConnectionChange = (connected: boolean) => {
            console.log('Connection changed:', connected);
            setIsConnected(connected);
            localStorage.setItem('bluetoothConnected', String(connected));
        };

        const onRoleChange = (role: PairingRole) => {
            console.log('Role changed:', role);
            setCurrentRole(role);
            localStorage.setItem('bluetoothRole', role);
        };

        bluetoothServiceInstance?.on('connectionChange', onConnectionChange);
        bluetoothServiceInstance?.on('roleChange', onRoleChange);

        // Restore previous state
        const savedRole = localStorage.getItem('bluetoothRole') as PairingRole;
        if (savedRole) {
            setCurrentRole(savedRole);
            if (savedRole === PairingRole.EMITTER) {
                bluetoothServiceInstance?.startAsEmitter()
                    .then(() => bluetoothServiceInstance?.tryReconnect())
                    .catch(console.error);
            } else if (savedRole === PairingRole.RECEIVER) {
                bluetoothServiceInstance?.advertiseAsReceiver().catch(console.error);
            }
        }

        // Cleanup listeners on unmount
        return () => {
            if (bluetoothServiceInstance) {
                bluetoothServiceInstance.off('connectionChange', onConnectionChange);
                bluetoothServiceInstance.off('roleChange', onRoleChange);
            }
        };
    }, [isClient]);

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

    return {
        isConnected,
        currentRole,
        bluetoothService: bluetoothServiceInstance,
        sendToken: async (token: OfflineToken) => {
            await bluetoothServiceInstance?.sendToken(token);
        }
    };
}