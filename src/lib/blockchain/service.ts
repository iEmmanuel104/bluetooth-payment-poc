/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/blockchain/service.ts
import { ethers } from 'ethers';
import { OfflineToken } from './types';

export class OfflineBlockchainService {
    private _wallet: ethers.BaseWallet;
    private pendingTransfers: Map<string, OfflineToken>;
    private listeners: Map<string, ((data?: any) => void)[]>;
    private static instance: OfflineBlockchainService | null = null;

    private constructor() {
        this.listeners = new Map();
        this.pendingTransfers = new Map();

        // Create a new wallet every time - for production you'd want to persist this securely
        this._wallet = ethers.Wallet.createRandom();
    }

    public static getInstance(): OfflineBlockchainService {
        if (!OfflineBlockchainService.instance) {
            OfflineBlockchainService.instance = new OfflineBlockchainService();
        }
        return OfflineBlockchainService.instance;
    }

    get walletAddress(): string {
        return this._wallet.address;
    }

    private emit(event: string, data?: any): void {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => callback(data));
    }

    on(event: string, callback: (data?: any) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    off(event: string, callback: (data?: any) => void): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    async createOfflineTransfer(token: Partial<OfflineToken>): Promise<OfflineToken> {
        const transferId = ethers.hexlify(ethers.randomBytes(16));
        const timestamp = Date.now();

        const offlineToken: OfflineToken = {
            tokenId: token.tokenId!,
            contractAddress: token.contractAddress!,
            type: token.type || 'ERC20',
            amount: token.amount!,
            decimals: token.decimals || 18,
            symbol: token.symbol || 'TOKEN',
            fromAddress: this._wallet.address,
            toAddress: null,
            transferId,
            timestamp,
            signature: '',
            onchainStatus: null
        };

        const message = this.createSignMessage(offlineToken);
        offlineToken.signature = await this._wallet.signMessage(message);

        this.pendingTransfers.set(transferId, offlineToken);
        this.emit('transferCreated', offlineToken);

        return offlineToken;
    }

    private loadPendingTransfers(): void {
        const stored = localStorage.getItem('pendingTransfers');
        if (stored) {
            try {
                const entries = JSON.parse(stored);
                this.pendingTransfers = new Map(entries);
                this.emit('transfersLoaded', Array.from(this.pendingTransfers.values()));
            } catch (error) {
                console.error('Error loading pending transfers:', error);
            }
        }
    }

    async receiveOfflineTransfer(token: OfflineToken): Promise<OfflineToken> {
        if (!await this.verifyOfflineTransfer(token)) {
            throw new Error('Invalid token signature');
        }

        const receivedToken: OfflineToken = {
            ...token,
            toAddress: this._wallet.address,
            onchainStatus: 'pending'
        };

        // Store received token
        this.pendingTransfers.set(token.transferId, receivedToken);
        this.savePendingTransfers();

        // Emit event
        this.emit('transferReceived', receivedToken);

        return receivedToken;
    }

    async verifyOfflineTransfer(token: OfflineToken): Promise<boolean> {
        const message = this.createSignMessage(token);
        try {
            const recoveredAddress = ethers.verifyMessage(message, token.signature);
            return recoveredAddress.toLowerCase() === token.fromAddress.toLowerCase();
        } catch (error) {
            console.error('Signature verification failed:', error);
            return false;
        }
    }

    async updateTransferStatus(transferId: string, status: 'pending' | 'confirmed' | 'failed' | null): Promise<void> {
        const token = this.pendingTransfers.get(transferId);
        if (token) {
            const updatedToken = { ...token, onchainStatus: status };
            this.pendingTransfers.set(transferId, updatedToken);
            this.savePendingTransfers();
            this.emit('transferStatusChanged', updatedToken);
        }
    }

    private savePendingTransfers(): void {
        try {
            localStorage.setItem(
                'pendingTransfers',
                JSON.stringify(Array.from(this.pendingTransfers.entries()))
            );
            this.emit('transfersSaved', Array.from(this.pendingTransfers.values()));
        } catch (error) {
            console.error('Error saving pending transfers:', error);
        }
    }

    private createSignMessage(token: OfflineToken): Uint8Array {
        const messageHash = ethers.solidityPackedKeccak256(
            ['string', 'string', 'string', 'uint256', 'string', 'uint256'],
            [
                token.transferId,
                token.contractAddress,
                token.amount,
                token.timestamp,
                token.fromAddress,
                token.toAddress ? BigInt(token.toAddress) : BigInt(0)
            ]
        );
        return ethers.getBytes(messageHash);
    }

    getPendingTransfers(): OfflineToken[] {
        return Array.from(this.pendingTransfers.values());
    }

    // async syncWithBlockchain(provider: ethers.Provider): Promise<void> {
    //     // To be implemented for online sync
    //     // This would validate and process transfers on-chain
    // }
}