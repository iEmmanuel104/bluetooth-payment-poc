// src/lib/hooks/use-offline-wallet.ts
import { useState, useEffect } from 'react';
import { OfflineToken } from '../blockchain/types';
import { OfflineBlockchainService } from '../blockchain/service';

export function useOfflineWallet() {
    const [service] = useState(() => new OfflineBlockchainService());
    const [pendingTransfers, setPendingTransfers] = useState<OfflineToken[]>([]);
    const [address, setAddress] = useState<string>('');

    useEffect(() => {
        setPendingTransfers(service.getPendingTransfers());
        setAddress(service.walletAddress);
    }, [service]);

    const createTransfer = async (
        amount: string,
        contractAddress: string,
        symbol: string
    ): Promise<OfflineToken> => {
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
        await service.receiveOfflineTransfer(token);
        setPendingTransfers(service.getPendingTransfers());
    };

    return {
        address,
        pendingTransfers,
        createTransfer,
        receiveTransfer,
        verifyTransfer: service.verifyOfflineTransfer.bind(service)
    };
}
