// src/lib/hooks/use-nfc.ts
import { useState, useEffect, useRef } from 'react';
import { NFCService } from '../nfc/service';
import { OfflineToken } from '../blockchain/types';
import { useToast } from '@/components/ui/use-toast';

let nfcServiceInstance: NFCService | null = null;

const isBrowser = typeof window !== 'undefined';

export function useNFCService() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [state, setState] = useState<'inactive' | 'reading' | 'writing'>('inactive');
    const [isReady, setIsReady] = useState(false);
    const [deviceDetected, setDeviceDetected] = useState(false);
    const checkingRef = useRef(false);
    const { toast } = useToast();

    // Create or get the singleton instance only in browser environment
    useEffect(() => {
        if (isBrowser && !nfcServiceInstance) {
            nfcServiceInstance = new NFCService();
        }
    }, []);

    useEffect(() => {
        if (!isBrowser) return;

        const checkNFCStatus = async () => {
            if (!nfcServiceInstance || checkingRef.current) return;

            checkingRef.current = true;
            try {
                const status = await nfcServiceInstance.checkAvailability();
                setIsEnabled(status.enabled);
                setIsReady(status.available && status.enabled);
            } finally {
                checkingRef.current = false;
            }
        };

        const onStateChange = (newState: 'inactive' | 'reading' | 'writing') => {
            setState(newState);
        };

        const onPermissionNeeded = () => {
            toast({
                title: "NFC Permission Required",
                description: "Please allow NFC access when prompted by your device",
                duration: 5000,
            });
        };

        const onDeviceDetected = () => {
            setDeviceDetected(true);
            toast({
                title: "NFC Device Detected",
                description: "Device is ready for payment transfer",
                duration: 3000,
            });

            // Reset device detected state after a delay
            setTimeout(() => setDeviceDetected(false), 3000);
        };

        if (nfcServiceInstance) {
            nfcServiceInstance.on('stateChange', onStateChange);
            nfcServiceInstance.on('permissionNeeded', onPermissionNeeded);
            nfcServiceInstance.on('deviceDetected', onDeviceDetected);

            // Initial check
            checkNFCStatus();
        }

        return () => {
            if (nfcServiceInstance) {
                nfcServiceInstance.off('stateChange', onStateChange);
                nfcServiceInstance.off('permissionNeeded', onPermissionNeeded);
                nfcServiceInstance.off('deviceDetected', onDeviceDetected);
            }
        };
    }, [toast]);

    const startReading = async () => {
        if (!isBrowser) return;

        try {
            await nfcServiceInstance?.startReading();
        } catch (error) {
            console.error('Failed to start NFC reading:', error);
            toast({
                title: "NFC Error",
                description: "Failed to start NFC reading. Please ensure NFC is enabled on your device.",
                variant: "destructive",
            });
            throw error;
        }
    };

    const stop = async () => {
        if (!isBrowser) return;

        try {
            await nfcServiceInstance?.stop();
            setDeviceDetected(false);
        } catch (error) {
            console.error('Failed to stop NFC:', error);
            throw error;
        }
    };

    const sendToken = async (token: OfflineToken) => {
        if (!isBrowser) return;
        if (!isReady) {
            throw new Error('NFC is not ready');
        }

        try {
            await nfcServiceInstance?.sendToken(token);
        } catch (error) {
            console.error('Failed to send token via NFC:', error);
            toast({
                title: "NFC Error",
                description: "Failed to send payment. Please ensure devices are close together and try again.",
                variant: "destructive",
            });
            throw error;
        }
    };

    return {
        isEnabled,
        isReady,
        state,
        deviceDetected,
        startReading,
        stop,
        sendToken,
        onTokenReceived: (callback: (token: OfflineToken) => void) => {
            if (!isBrowser) return () => { };

            nfcServiceInstance?.on('tokenReceived', callback);
            return () => nfcServiceInstance?.off('tokenReceived', callback);
        }
    };
}