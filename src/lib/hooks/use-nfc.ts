// src/lib/hooks/use-nfc.ts
import { useState, useEffect, useRef } from 'react';
import { NFCService } from '../nfc/service';
import { PairingRole } from '@/types/bluetooth';
import { OfflineToken } from '../blockchain/types';

let nfcServiceInstance: NFCService | null = null;

export function useNFCService() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [currentRole, setCurrentRole] = useState<PairingRole>(PairingRole.NONE);
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

        const onRoleChange = (role: PairingRole) => {
            console.log('NFC Role changed:', role);
            setCurrentRole(role);
            localStorage.setItem('nfcRole', role);
        };

        nfcServiceInstance?.on('roleChange', onRoleChange);

        // Initial check only - removed periodic updates to prevent scanning conflicts
        checkNFCStatus();

        // Restore previous state only if we're not already in a role
        const savedRole = localStorage.getItem('nfcRole') as PairingRole;
        if (savedRole && currentRole === PairingRole.NONE) {
            setCurrentRole(savedRole);
            if (savedRole === PairingRole.EMITTER) {
                nfcServiceInstance?.startAsEmitter().catch(console.error);
            } else if (savedRole === PairingRole.RECEIVER) {
                nfcServiceInstance?.advertiseAsReceiver().catch(console.error);
            }
        }

        return () => {
            if (nfcServiceInstance) {
                nfcServiceInstance.off('roleChange', onRoleChange);
            }
        };
    }, [currentRole]);

    return {
        isEnabled,
        isReady,
        currentRole,
        nfcService: nfcServiceInstance,
        sendToken: async (token: OfflineToken) => {
            await nfcServiceInstance?.sendToken(token);
        }
    };
}