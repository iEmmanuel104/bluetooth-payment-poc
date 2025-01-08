// src/lib/hooks/use-wallet.ts
import { useState, useEffect } from 'react';
import { Token, Wallet } from '@/types';
import { Database } from '@/lib/db';

const db = new Database();

export function useWallet() {
    const [wallet, setWallet] = useState<Wallet>({
        address: '',
        balance: 0,
        tokens: []
    });

    useEffect(() => {
        const initializeWallet = async () => {
            await db.initialize();
            const address = crypto.randomUUID();
            const savedWallet = await db.getWallet(address);

            if (savedWallet) {
                setWallet(savedWallet);
            } else {
                const newWallet: Wallet = {
                    address,
                    balance: 1000, // Initial balance for demo
                    tokens: []
                };
                await db.saveWallet(newWallet);
                setWallet(newWallet);
            }
        };

        initializeWallet();
    }, []);

    const createToken = async (amount: number): Promise<Token> => {
        if (amount > wallet.balance) {
            throw new Error('Insufficient balance');
        }

        const token: Token = {
            id: crypto.randomUUID(),
            amount,
            issueDate: Date.now(),
            expiryDate: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            signature: 'demo-signature-' + crypto.randomUUID(),
            status: 'active'
        };

        const updatedWallet = {
            ...wallet,
            balance: wallet.balance - amount,
            tokens: [...wallet.tokens, token]
        };

        await db.saveWallet(updatedWallet);
        await db.saveToken(token);
        setWallet(updatedWallet);

        return token;
    };

    return {
        wallet,
        createToken
    };
}