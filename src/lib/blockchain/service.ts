// src/lib/blockchain/service.ts
import { ethers } from 'ethers';
import { OfflineToken } from './types';

export class OfflineBlockchainService {
    private _wallet: ethers.BaseWallet;
    private pendingTransfers: Map<string, OfflineToken>;

    constructor() {
        // Generate deterministic wallet from local storage seed
        const storedSeed = localStorage.getItem('walletSeed');
        let privateKey: string;
        if (storedSeed) {
            // If we have a stored seed phrase, derive the private key
            const hdNode = ethers.HDNodeWallet.fromPhrase(storedSeed);
            privateKey = hdNode.privateKey;
        } else {
            // Generate a new wallet and store its seed phrase
            const wallet = ethers.Wallet.createRandom();
            localStorage.setItem('walletSeed', wallet.mnemonic?.phrase || '');
            privateKey = wallet.privateKey;
        }

        // Create wallet from private key
        this._wallet = new ethers.Wallet(privateKey);
        this.pendingTransfers = new Map();

        // Load pending transfers from localStorage
        this.loadPendingTransfers();
    }

    // Rest of the implementation remains the same...
    get walletAddress(): string {
        return this._wallet.address;
    }

    private loadPendingTransfers(): void {
        const stored = localStorage.getItem('pendingTransfers');
        if (stored) {
            const entries = JSON.parse(stored);
            this.pendingTransfers = new Map(entries);
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

        // Create signature for offline verification
        const message = this.createSignMessage(offlineToken);
        offlineToken.signature = await this._wallet.signMessage(message);

        // Store in pending transfers
        this.pendingTransfers.set(transferId, offlineToken);
        this.savePendingTransfers();

        return offlineToken;
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

        return receivedToken;
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

    private savePendingTransfers(): void {
        localStorage.setItem(
            'pendingTransfers',
            JSON.stringify(Array.from(this.pendingTransfers.entries()))
        );
    }

    getPendingTransfers(): OfflineToken[] {
        return Array.from(this.pendingTransfers.values());
    }

    async syncWithBlockchain(provider: ethers.Provider): Promise<void> {
        // To be implemented for online sync
        // This would validate and process transfers on-chain
    }
}