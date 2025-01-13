// src/lib/hooks/use-offline-wallet.ts
import { useState, useEffect } from 'react';
import { OfflineToken } from '../blockchain/types';
import { OfflineBlockchainService } from '../blockchain/service';

export function useOfflineWallet() {
    const [service, setService] = useState<OfflineBlockchainService | null>(null);
    const [pendingTransfers, setPendingTransfers] = useState<OfflineToken[]>([]);
    const [address, setAddress] = useState<string>('');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        const blockchainService = OfflineBlockchainService.getInstance();
        setService(blockchainService);
        setPendingTransfers(blockchainService.getPendingTransfers());
        setAddress(blockchainService.walletAddress);

        const handleTransferCreated = () => {
            setPendingTransfers(blockchainService.getPendingTransfers());
        };

        const handleTransferReceived = () => {
            setPendingTransfers(blockchainService.getPendingTransfers());
        };

        blockchainService.on('transferCreated', handleTransferCreated);
        blockchainService.on('transferReceived', handleTransferReceived);

        return () => {
            blockchainService.off('transferCreated', handleTransferCreated);
            blockchainService.off('transferReceived', handleTransferReceived);
        };
    }, [isClient]);

    const createTransfer = async (
        amount: string,
        contractAddress: string,
        symbol: string
    ): Promise<OfflineToken> => {
        if (!service) {
            throw new Error('Wallet service not initialized');
        }

        const token = await service.createOfflineTransfer({
            amount,
            contractAddress,
            symbol,
            decimals: 18,
            type: 'ERC20',
            tokenId: Date.now().toString()
        });

        setPendingTransfers(service.getPendingTransfers());
        return token;
    };

    const receiveTransfer = async (token: OfflineToken): Promise<void> => {
        if (!service) {
            throw new Error('Wallet service not initialized');
        }

        await service.receiveOfflineTransfer(token);
        setPendingTransfers(service.getPendingTransfers());
    };

    // Return null or default values during SSR
    if (!isClient || !service) {
        return {
            address: '',
            pendingTransfers: [],
            createTransfer: async () => {
                throw new Error('Wallet not available during server-side rendering');
            },
            receiveTransfer: async () => {
                throw new Error('Wallet not available during server-side rendering');
            },
            verifyTransfer: async () => false
        };
    }

    return {
        address,
        pendingTransfers,
        createTransfer,
        receiveTransfer,
        verifyTransfer: service.verifyOfflineTransfer.bind(service)
    };
}