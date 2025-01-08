// src/lib/hooks/use-bluetooth.ts
import { useState, useEffect } from 'react';
import { BluetoothService } from '../bluetooth/service';
import { Token } from '@/types';
import { PairingRole } from '@/types/bluetooth';

let bluetoothServiceInstance: BluetoothService | null = null;

export function useBluetoothService() {
    const [isConnected, setIsConnected] = useState(false);
    const [currentRole, setCurrentRole] = useState<PairingRole>(PairingRole.NONE);

    useEffect(() => {
        bluetoothServiceInstance?.on('connectionChange', (connected: boolean) => {
            setIsConnected(connected);
        });

        bluetoothServiceInstance?.on('roleChange', (role: PairingRole) => {
            setCurrentRole(role);
        });
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