// src/lib/blockchain/types.ts
export interface OfflineToken {
    tokenId: string;
    contractAddress: string;
    type: 'ERC20' | 'ERC721' | 'ERC1155';
    amount: string;
    decimals: number;
    symbol: string;
    fromAddress: string;
    toAddress: string | null;
    transferId: string;
    timestamp: number;
    signature: string;
    onchainStatus: 'pending' | 'confirmed' | 'failed' | null;
}