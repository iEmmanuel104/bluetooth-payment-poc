import { useState, useEffect } from 'react';
import { BluetoothService } from '../bluetooth/service';
import { Token } from '@/types';
import { PairingRole } from '@/types/bluetooth';

let bluetoothServiceInstance: BluetoothService | null = null;

export function useBluetoothService() {
    const [isConnected, setIsConnected] = useState(false);
    const [currentRole, setCurrentRole] = useState<PairingRole>(PairingRole.NONE);

    // Create or get the singleton instance
    if (!bluetoothServiceInstance) {
        bluetoothServiceInstance = new BluetoothService();
    }

    useEffect(() => {
        // Set up event listeners
        const onConnectionChange = (connected: boolean) => {
            console.log('Connection changed:', connected);
            setIsConnected(connected);
        };

        const onRoleChange = (role: PairingRole) => {
            console.log('Role changed:', role);
            setCurrentRole(role);
        };

        bluetoothServiceInstance?.on('connectionChange', onConnectionChange);
        bluetoothServiceInstance?.on('roleChange', onRoleChange);

        // Get initial role
        const initialRole = bluetoothServiceInstance?.getCurrentRole() || PairingRole.NONE;
        setCurrentRole(initialRole);

        // Cleanup listeners on unmount
        return () => {
            if (bluetoothServiceInstance) {
                bluetoothServiceInstance.off('connectionChange', onConnectionChange);
                bluetoothServiceInstance.off('roleChange', onRoleChange);
            }
        };
    }, []);

    return {
        isConnected,
        currentRole,
        bluetoothService: bluetoothServiceInstance,
        connect: async () => {
            await bluetoothServiceInstance?.connect();
        },
        sendToken: async (token: Token) => {
            await bluetoothServiceInstance?.sendToken(token);
        }
    };
}
