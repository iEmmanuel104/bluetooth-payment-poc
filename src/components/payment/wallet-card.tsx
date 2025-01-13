// src/components/payment/wallet-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/lib/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, Wallet, Clock, CheckCircle2, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

export function WalletCard() {
    const { wallet, refreshWallet, getPendingBalance, getConfirmedBalance } = useWallet();
    const { toast } = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    // Calculate token statistics
    const confirmedTokens = wallet.tokens.filter((t) => t.onchainStatus === "confirmed").length;
    const pendingTokens = wallet.tokens.filter((t) => t.onchainStatus === "pending").length;

    // Calculate balance percentages for the progress bar
    const confirmedBalance = BigInt(getConfirmedBalance());
    const totalBalance = BigInt(wallet.balance);

    // Calculate confirmed balance percentage
    const confirmedBalancePercent = totalBalance > BigInt(0) ? Number((confirmedBalance * BigInt(100)) / totalBalance) : 0;

    return (
        <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
                <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
            </div>

            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Wallet className="h-5 w-5" />
                    <span>Your Wallet</span>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Balance Section */}
                <div className="space-y-3">
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold">{wallet.balance} TOKEN</span>
                        <span className="text-sm text-muted-foreground">Total Balance</span>
                    </div>

                    <div className="space-y-2">
                        <Progress value={confirmedBalancePercent} className="h-2 bg-gray-100" />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center space-x-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-muted-foreground">{getConfirmedBalance()} Confirmed</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-yellow-500" />
                                <span className="text-muted-foreground">{getPendingBalance()} Pending</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Address Section */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Address</span>
                        <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" onClick={copyAddress} className="h-8">
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8" asChild>
                                <a href={`https://etherscan.io/address/${wallet.address}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    View
                                </a>
                            </Button>
                        </div>
                    </div>
                    <p className="mt-1 font-mono text-sm truncate">{wallet.address}</p>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm text-muted-foreground">Active Tokens</span>
                        <p className="text-2xl font-semibold mt-1">{confirmedTokens}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm text-muted-foreground">Pending Transfers</span>
                        <p className="text-2xl font-semibold mt-1">{pendingTokens}</p>
                    </div>
                </div>

                <div className="text-xs text-muted-foreground text-right">Last updated: {new Date(wallet.lastUpdated).toLocaleString()}</div>
            </CardContent>
        </Card>
    );
}
