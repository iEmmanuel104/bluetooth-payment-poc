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
    const [service, setService] = useState<OfflineBlockchainService | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [wallet, setWallet] = useState<WalletState>({
        address: '',
        balance: '0',
        tokens: [],
        lastUpdated: Date.now()
    });

    useEffect(() => {
        setIsClient(true);
    }, []);

    const updateWalletState = useCallback(async () => {
        if (!service) return;

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

    // Initialize wallet service and state
    useEffect(() => {
        if (!isClient) return;

        const blockchainService = OfflineBlockchainService.getInstance();
        setService(blockchainService);

        const handleTransferUpdate = () => {
            updateWalletState();
        };

        blockchainService.on('transferCreated', handleTransferUpdate);
        blockchainService.on('transferReceived', handleTransferUpdate);
        blockchainService.on('transferStatusChanged', handleTransferUpdate);

        updateWalletState();

        return () => {
            blockchainService.off('transferCreated', handleTransferUpdate);
            blockchainService.off('transferReceived', handleTransferUpdate);
            blockchainService.off('transferStatusChanged', handleTransferUpdate);
        };
    }, [isClient, updateWalletState]);

    const createToken = async (amount: string): Promise<OfflineToken> => {
        if (!service) {
            throw new Error('Wallet service not initialized');
        }

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

        await updateWalletState();
        return token;
    };

    const createTransfer = async (
        amount: string,
        contractAddress: string,
        symbol: string
    ): Promise<OfflineToken> => {
        if (!service) {
            throw new Error('Wallet service not initialized');
        }

        if (BigInt(amount) > BigInt(wallet.balance)) {
            throw new Error('Insufficient balance');
        }

        const token = await service.createOfflineTransfer({
            amount,
            contractAddress,
            symbol,
            decimals: 18,
            type: 'ERC20',
            tokenId: Date.now().toString()
        });

        await updateWalletState();
        return token;
    };

    const receiveTransfer = async (token: OfflineToken): Promise<void> => {
        if (!service) {
            throw new Error('Wallet service not initialized');
        }

        await service.receiveOfflineTransfer(token);
        await updateWalletState();
    };

    const getConfirmedBalance = useCallback(() => {
        const confirmedTokens = wallet.tokens.filter(t => t.onchainStatus === 'confirmed');
        return confirmedTokens.reduce((acc, token) => acc + BigInt(token.amount), BigInt(0)).toString();
    }, [wallet.tokens]);

    const getPendingBalance = useCallback(() => {
        const pendingTokens = wallet.tokens.filter(t => t.onchainStatus === 'pending');
        return pendingTokens.reduce((acc, token) => acc + BigInt(token.amount), BigInt(0)).toString();
    }, [wallet.tokens]);

    // Return null or default values during SSR
    if (!isClient || !service) {
        return {
            wallet: {
                address: '',
                balance: '0',
                tokens: [],
                lastUpdated: Date.now()
            },
            pendingTransfers: [],
            createToken: async () => {
                throw new Error('Wallet not available during server-side rendering');
            },
            createTransfer: async () => {
                throw new Error('Wallet not available during server-side rendering');
            },
            receiveTransfer: async () => {
                throw new Error('Wallet not available during server-side rendering');
            },
            verifyTransfer: async () => false,
            getConfirmedBalance: () => '0',
            getPendingBalance: () => '0',
            refreshWallet: async () => {
                throw new Error('Wallet not available during server-side rendering');
            }
        };
    }

    return {
        wallet,
        pendingTransfers: wallet.tokens,
        createToken,
        createTransfer,
        receiveTransfer,
        verifyTransfer: service.verifyOfflineTransfer.bind(service),
        getConfirmedBalance,
        getPendingBalance,
        refreshWallet: updateWalletState
    };
}