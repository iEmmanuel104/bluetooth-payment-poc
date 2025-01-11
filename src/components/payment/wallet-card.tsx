// src/components/payment/wallet-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/lib/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

export function WalletCard() {
    const { wallet, refreshWallet, getConfirmedBalance, getPendingBalance } = useWallet();
    const { toast } = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const getActiveTokens = () => {
        return wallet.tokens.filter((t) => t.onchainStatus === "confirmed").length;
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshWallet();
        setIsRefreshing(false);
    };

    const copyAddress = () => {
        navigator.clipboard.writeText(wallet.address);
        toast({
            title: "Address Copied",
            description: "Wallet address copied to clipboard",
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Wallet</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Balance:</span>
                            <span className="text-2xl font-bold">{wallet.balance} TOKEN</span>
                        </div>
                        {getPendingBalance() !== "0" && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Pending:</span>
                                <span className="text-yellow-600">+{getPendingBalance()} TOKEN</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Address:</span>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-mono truncate max-w-[150px]">{wallet.address}</span>
                            <Button variant="ghost" size="sm" onClick={copyAddress}>
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Active Tokens:</span>
                        <span>{getActiveTokens()}</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Pending Transfers:</span>
                        <span>{wallet.tokens.filter((t) => t.onchainStatus === "pending").length}</span>
                    </div>

                    <div className="text-xs text-muted-foreground text-right">Last updated: {new Date(wallet.lastUpdated).toLocaleTimeString()}</div>
                </div>
            </CardContent>
        </Card>
    );
}
