// src/lib/hooks/use-nfc.ts
import { useState, useEffect } from 'react';
import { NFCService } from '../nft/service';
import { PairingRole } from '@/types/bluetooth';
import { OfflineToken } from '../blockchain/types';

let nfcServiceInstance: NFCService | null = null;

export function useNFCService() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [currentRole, setCurrentRole] = useState<PairingRole>(PairingRole.NONE);
    const [isReady, setIsReady] = useState(false);

    // Create or get the singleton instance
    if (!nfcServiceInstance) {
        nfcServiceInstance = new NFCService();
    }

    useEffect(() => {
        const checkNFCStatus = async () => {
            if (nfcServiceInstance) {
                const status = await nfcServiceInstance.checkAvailability();
                setIsEnabled(status.enabled);
                setIsReady(status.available && status.enabled);
            }
        };

        const onRoleChange = (role: PairingRole) => {
            console.log('NFC Role changed:', role);
            setCurrentRole(role);
            localStorage.setItem('nfcRole', role);
        };

        nfcServiceInstance?.on('roleChange', onRoleChange);

        // Initial check and periodic updates
        checkNFCStatus();
        const interval = setInterval(checkNFCStatus, 2000);

        // Restore previous state
        const savedRole = localStorage.getItem('nfcRole') as PairingRole;
        if (savedRole) {
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
                clearInterval(interval);
            }
        };
    }, []);

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