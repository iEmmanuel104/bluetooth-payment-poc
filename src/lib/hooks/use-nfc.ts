// src/lib/hooks/use-nfc.ts
import { useState, useEffect, useRef, useCallback } from 'react';
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

    // Initialize service
    useEffect(() => {
        if (isBrowser && !nfcServiceInstance) {
            nfcServiceInstance = new NFCService();
        }
    }, []);

    // Check NFC status
    const checkNFCStatus = useCallback(async () => {
        if (!nfcServiceInstance || checkingRef.current) return;

        checkingRef.current = true;
        try {
            const status = await nfcServiceInstance.checkAvailability();
            setIsEnabled(status.enabled);
            setIsReady(status.available && status.enabled);
        } finally {
            checkingRef.current = false;
        }
    }, []);

    // Setup event listeners
    useEffect(() => {
        if (!isBrowser || !nfcServiceInstance) return;

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

        const onDeviceDetected = ({ serialNumber }: { serialNumber?: string }) => {
            setDeviceDetected(true);
            toast({
                title: "NFC Device Detected",
                description: serialNumber
                    ? `Device connected (ID: ${serialNumber})`
                    : "Device is ready for payment transfer",
                duration: 3000,
            });

            setTimeout(() => setDeviceDetected(false), 3000);
        };

        const onReadingError = (error: Error) => {
            toast({
                title: "NFC Error",
                description: error.message || "Failed to read NFC device",
                variant: "destructive",
                duration: 5000,
            });
        };

        nfcServiceInstance.on('stateChange', onStateChange);
        nfcServiceInstance.on('permissionNeeded', onPermissionNeeded);
        nfcServiceInstance.on('deviceDetected', onDeviceDetected);
        nfcServiceInstance.on('readingError', onReadingError);

        // Initial check
        checkNFCStatus();

        return () => {
            nfcServiceInstance?.off('stateChange', onStateChange);
            nfcServiceInstance?.off('permissionNeeded', onPermissionNeeded);
            nfcServiceInstance?.off('deviceDetected', onDeviceDetected);
            nfcServiceInstance?.off('readingError', onReadingError);
        };
    }, [toast, checkNFCStatus]);

    const startReading = async () => {
        if (!isBrowser) return;

        try {
            await nfcServiceInstance?.startReading();
        } catch (error) {
            toast({
                title: "NFC Error",
                description: (error instanceof Error ? error.message : "Unknown error") || "Failed to start NFC reading. Please ensure NFC is enabled.",
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
            toast({
                title: "Success",
                description: "Payment token sent successfully",
                duration: 3000,
            });
        } catch (error) {
            if (error instanceof Error) {
                toast({
                    title: "Transfer Failed",
                    description: error.message || "Failed to send payment. Please try again.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Transfer Failed",
                    description: "Failed to send payment. Please try again.",
                    variant: "destructive",
                });
            }
            throw error;
        }
    };

    const onTokenReceived = useCallback((callback: (token: OfflineToken) => void) => {
        if (!isBrowser) return () => { };

        const wrappedCallback = (token: OfflineToken) => {
            toast({
                title: "Payment Received",
                description: `Received payment token for ${token.amount}`,
                duration: 3000,
            });
            callback(token);
        };

        nfcServiceInstance?.on('tokenReceived', wrappedCallback);
        return () => nfcServiceInstance?.off('tokenReceived', wrappedCallback);
    }, [toast]);

    return {
        isEnabled,
        isReady,
        state,
        deviceDetected,
        startReading,
        stop,
        sendToken,
        onTokenReceived
    };
}