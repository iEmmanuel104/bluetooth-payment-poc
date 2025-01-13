// components/payment/token-list.tsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { PairingRole } from "@/types/bluetooth";
import { useOfflineWallet } from "@/lib/hooks/use-offline-wallet";

export function TokenList() {
    const { currentRole } = useBluetoothService();
    const { pendingTransfers } = useOfflineWallet();

    // Show different titles based on the role
    const getTitle = () => {
        switch (currentRole) {
            case PairingRole.EMITTER:
                return "Sent Payments";
            case PairingRole.RECEIVER:
                return "Received Payments";
            default:
                return "Transaction History";
        }
    };

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case "confirmed":
                return "bg-green-100 text-green-800";
            case "pending":
                return "bg-yellow-100 text-yellow-800";
            case "failed":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{getTitle()}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {pendingTransfers.length === 0 ? (
                        <p className="text-muted-foreground">No transactions yet</p>
                    ) : (
                        <div className="grid gap-4">
                            {pendingTransfers.map((token) => (
                                <div key={token.transferId} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-medium">
                                            Amount: {token.amount} {token.symbol}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{new Date(token.timestamp).toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">To: {token.toAddress || "Pending"}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(token.onchainStatus)}`}>
                                        {token.onchainStatus || "Pending"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
