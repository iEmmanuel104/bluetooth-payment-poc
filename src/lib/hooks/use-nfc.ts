// src/lib/hooks/use-nfc.ts
import { useState, useEffect, useRef } from 'react';
import { NFCService } from '../nfc/service';
import { OfflineToken } from '../blockchain/types';

let nfcServiceInstance: NFCService | null = null;

export function useNFCService() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [state, setState] = useState<'inactive' | 'reading' | 'writing'>('inactive');
    const [isReady, setIsReady] = useState(false);
    const checkingRef = useRef(false);

    // Create or get the singleton instance
    if (!nfcServiceInstance) {
        nfcServiceInstance = new NFCService();
    }

    useEffect(() => {
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

        nfcServiceInstance?.on('stateChange', onStateChange);

        // Initial check
        checkNFCStatus();

        return () => {
            if (nfcServiceInstance) {
                nfcServiceInstance.off('stateChange', onStateChange);
            }
        };
    }, []);

    const startReading = async () => {
        try {
            await nfcServiceInstance?.startReading();
        } catch (error) {
            console.error('Failed to start NFC reading:', error);
            throw error;
        }
    };

    const stop = async () => {
        try {
            await nfcServiceInstance?.stop();
        } catch (error) {
            console.error('Failed to stop NFC:', error);
            throw error;
        }
    };

    const sendToken = async (token: OfflineToken) => {
        if (!isReady) {
            throw new Error('NFC is not ready');
        }
        await nfcServiceInstance?.sendToken(token);
    };

    return {
        isEnabled,
        isReady,
        state,
        startReading,
        stop,
        sendToken,
        onTokenReceived: (callback: (token: OfflineToken) => void) => {
            nfcServiceInstance?.on('tokenReceived', callback);
            return () => nfcServiceInstance?.off('tokenReceived', callback);
        }
    };
}