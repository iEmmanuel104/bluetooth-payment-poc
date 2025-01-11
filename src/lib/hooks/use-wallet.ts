// src/lib/hooks/use-wallet.ts
import { useState, useEffect } from 'react';
import { OfflineToken } from '../blockchain/types';
import { OfflineBlockchainService } from '../blockchain/service';

interface WalletState {
    address: string;
    balance: string;
    tokens: OfflineToken[];
}

export function useWallet() {
    const [wallet, setWallet] = useState<WalletState>({
        address: '',
        balance: '0',
        tokens: []
    });

    const [service] = useState(() => new OfflineBlockchainService());

    useEffect(() => {
        const initializeWallet = async () => {
            const address = service.walletAddress;
            const tokens = service.getPendingTransfers();

            setWallet({
                address,
                balance: '1000', // Demo balance
                tokens
            });
        };

        initializeWallet();
    }, [service]);

    const createToken = async (amount: string): Promise<OfflineToken> => {
        if (BigInt(amount) > BigInt(wallet.balance)) {
            throw new Error('Insufficient balance');
        }

        const token = await service.createOfflineTransfer({
            amount,
            contractAddress: '0x0000000000000000000000000000000000000000', // Demo contract
            symbol: 'TOKEN',
            decimals: 18,
            type: 'ERC20',
            tokenId: Date.now().toString()
        });

        setWallet(prev => ({
            ...prev,
            balance: (BigInt(prev.balance) - BigInt(amount)).toString(),
            tokens: [...prev.tokens, token]
        }));

        return token;
    };

    return {
        wallet,
        createToken
    };
}