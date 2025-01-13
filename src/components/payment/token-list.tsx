/* eslint-disable @typescript-eslint/no-explicit-any */
// components/payment/token-list.tsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { useOfflineWallet } from "@/lib/hooks/use-offline-wallet";
import { PairingRole } from "@/types/bluetooth";
import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, XCircle } from "lucide-react";

export function TokenList() {
    const { currentRole } = useBluetoothService();
    const { pendingTransfers, verifyTransfer } = useOfflineWallet();

    // Filter transfers based on role
    const filteredTransfers = React.useMemo(() => {
        return pendingTransfers.filter((transfer) => {
            if (currentRole === PairingRole.EMITTER) {
                return transfer.fromAddress === transfer.fromAddress; // Sent transactions
            } else if (currentRole === PairingRole.RECEIVER) {
                return transfer.toAddress === transfer.toAddress; // Received transactions
            }
            return true; // Show all if no role selected
        });
    }, [pendingTransfers, currentRole]);

    const StatusIcon = ({ status }: { status: string | null }) => {
        switch (status) {
            case "confirmed":
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case "pending":
                return <Clock className="w-5 h-5 text-yellow-500" />;
            case "failed":
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    const TransferCard = ({ transfer }: { transfer: any }) => {
        const [isVerified, setIsVerified] = React.useState<boolean | null>(null);

        React.useEffect(() => {
            const checkVerification = async () => {
                const verified = await verifyTransfer(transfer);
                setIsVerified(verified);
            };
            checkVerification();
        }, [transfer]);

        const isSent = currentRole === PairingRole.EMITTER;
        const formattedAmount = new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
        }).format(Number(transfer.amount));

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                            {isSent ? <ArrowUpRight className="w-6 h-6 text-red-500" /> : <ArrowDownLeft className="w-6 h-6 text-green-500" />}
                            <div>
                                <p className="font-semibold text-lg">
                                    {formattedAmount} {transfer.symbol}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(transfer.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                        <StatusIcon status={transfer.onchainStatus} />
                    </div>

                    <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">{isSent ? "To" : "From"}:</span>
                            <span className="font-mono text-xs">{isSent ? transfer.toAddress || "Pending..." : transfer.fromAddress}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Status:</span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                    isVerified
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                        : isVerified === false
                                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
                                }`}
                            >
                                {isVerified ? "Verified" : isVerified === false ? "Invalid" : "Checking..."}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Card className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>
                        {currentRole === PairingRole.EMITTER
                            ? "Sent Payments"
                            : currentRole === PairingRole.RECEIVER
                            ? "Received Payments"
                            : "Transaction History"}
                    </span>
                    <span className="text-sm font-normal text-gray-500">
                        {filteredTransfers.length} transaction{filteredTransfers.length !== 1 ? "s" : ""}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {filteredTransfers.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 dark:text-gray-400">
                                No {currentRole === PairingRole.EMITTER ? "sent" : currentRole === PairingRole.RECEIVER ? "received" : ""}{" "}
                                transactions yet
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredTransfers.map((transfer) => (
                                <TransferCard key={transfer.transferId} transfer={transfer} />
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}