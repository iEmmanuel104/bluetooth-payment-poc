// src/components/payment/wallet-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/lib/hooks/use-wallet";

export function WalletCard() {
    const { wallet } = useWallet();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Wallet</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Balance:</span>
                        <span className="text-2xl font-bold">{wallet.balance}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="text-sm font-mono truncate max-w-[200px]">{wallet.address}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Active Tokens:</span>
                        <span>{wallet.tokens.filter((t) => t.status === "active").length}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
