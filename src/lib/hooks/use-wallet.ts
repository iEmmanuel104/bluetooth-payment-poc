// src/lib/hooks/use-wallet.ts
import { useState, useEffect, useCallback } from 'react';
import { OfflineToken } from '../blockchain/types';
import { OfflineBlockchainService } from '../blockchain/service';

interface WalletState {
    address: string;
    balance: string;
    tokens: OfflineToken[];
    lastUpdated: number;
}

const INITIAL_BALANCE = '1000'; // Demo balance

export function useWallet() {
    const [wallet, setWallet] = useState<WalletState>({
        address: '',
        balance: '0',
        tokens: [],
        lastUpdated: Date.now()
    });

    const [service] = useState(() => new OfflineBlockchainService());

    const updateWalletState = useCallback(async () => {
        const address = service.walletAddress;
        const tokens = service.getPendingTransfers();

        // Calculate actual balance by subtracting spent tokens
        const spentAmount = tokens
            .filter(t => t.fromAddress === address && t.onchainStatus !== 'failed')
            .reduce((acc, token) => acc + BigInt(token.amount), BigInt(0));

        const receivedAmount = tokens
            .filter(t => t.toAddress === address && t.onchainStatus === 'confirmed')
            .reduce((acc, token) => acc + BigInt(token.amount), BigInt(0));

        const currentBalance = (BigInt(INITIAL_BALANCE) - spentAmount + receivedAmount).toString();

        setWallet({
            address,
            balance: currentBalance,
            tokens,
            lastUpdated: Date.now()
        });
    }, [service]);

    // Initialize wallet
    useEffect(() => {
        updateWalletState();
    }, [updateWalletState]);

    // Listen for blockchain service events
    useEffect(() => {
        const handleTransferUpdate = () => {
            updateWalletState();
        };

        service.on('transferCreated', handleTransferUpdate);
        service.on('transferReceived', handleTransferUpdate);
        service.on('transferStatusChanged', handleTransferUpdate);

        return () => {
            service.off('transferCreated', handleTransferUpdate);
            service.off('transferReceived', handleTransferUpdate);
            service.off('transferStatusChanged', handleTransferUpdate);
        };
    }, [service, updateWalletState]);

    const createToken = async (amount: string): Promise<OfflineToken> => {
        if (BigInt(amount) > BigInt(wallet.balance)) {
            throw new Error('Insufficient balance');
        }

        const token = await service.createOfflineTransfer({
            amount,
            contractAddress: '0x0000000000000000000000000000000000000000',
            symbol: 'TOKEN',
            decimals: 18,
            type: 'ERC20',
            tokenId: Date.now().toString()
        });

        // Update wallet state immediately after creating token
        await updateWalletState();
        return token;
    };

    const getConfirmedBalance = useCallback(() => {
        const confirmedTokens = wallet.tokens.filter(t => t.onchainStatus === 'confirmed');
        return confirmedTokens.reduce((acc, token) => acc + BigInt(token.amount), BigInt(0)).toString();
    }, [wallet.tokens]);

    const getPendingBalance = useCallback(() => {
        const pendingTokens = wallet.tokens.filter(t => t.onchainStatus === 'pending');
        return pendingTokens.reduce((acc, token) => acc + BigInt(token.amount), BigInt(0)).toString();
    }, [wallet.tokens]);

    return {
        wallet,
        createToken,
        getConfirmedBalance,
        getPendingBalance,
        refreshWallet: updateWalletState
    };
}
