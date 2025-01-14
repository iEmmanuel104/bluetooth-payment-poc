// components/payment/payment-form.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { useNFCService } from "@/lib/hooks/use-nfc";
import { CommunicationType } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bluetooth, Loader2, Nfc, Smartphone, Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PaymentFormProps {
    isConnected: boolean;
    communicationType: CommunicationType;
}

export function PaymentForm({ isConnected, communicationType }: PaymentFormProps) {
    const [amount, setAmount] = useState("");
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const { wallet, createTransfer } = useWallet();
    const { bluetoothService, currentRole } = useBluetoothService();
    const { isReady: isNFCReady, state: nfcState, deviceDetected, sendToken: sendNFCToken, startReading, stop } = useNFCService();

    // Calculate percentage of balance being sent
    const balancePercentage = amount ? Math.min((Number(amount) / Number(wallet.balance)) * 100, 100) : 0;

    // Memoize NFC functions to prevent dependency warnings
    const handleStartReading = useCallback(async () => {
        if (communicationType === CommunicationType.NFC && isNFCReady) {
            await startReading();
        }
    }, [communicationType, isNFCReady, startReading]);

    const handleStop = useCallback(async () => {
        if (communicationType === CommunicationType.NFC) {
            await stop();
        }
    }, [communicationType, stop]);

    useEffect(() => {
        handleStartReading();
        return () => {
            handleStop();
        };
    }, [handleStartReading, handleStop]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate Bluetooth connection when in Bluetooth mode
        if (communicationType === CommunicationType.BLUETOOTH) {
            if (!bluetoothService) {
                toast({
                    title: "Bluetooth Error",
                    description: "Bluetooth service not available",
                    variant: "destructive",
                });
                return;
            }

            if (!isConnected) {
                toast({
                    title: "Not Connected",
                    description: "Please connect to a device before sending payment",
                    variant: "destructive",
                });
                return;
            }

            if (currentRole !== "emitter") {
                toast({
                    title: "Invalid Role",
                    description: "Must be in sender mode to send payments",
                    variant: "destructive",
                });
                return;
            }
        }

        // Validate NFC when in NFC mode
        if (communicationType === CommunicationType.NFC && !isNFCReady) {
            toast({
                title: "NFC Not Available",
                description: "Please enable NFC on your device",
                variant: "destructive",
            });
            return;
        }

        // Validate amount
        if (!amount || BigInt(amount) <= BigInt(0)) {
            toast({
                title: "Invalid Amount",
                description: "Please enter a valid amount",
                variant: "destructive",
            });
            return;
        }

        if (BigInt(amount) > BigInt(wallet.balance)) {
            toast({
                title: "Insufficient Balance",
                description: "You don't have enough tokens",
                variant: "destructive",
            });
            return;
        }

        setIsSending(true);
        try {
            const token = await createTransfer(amount, "0x0000000000000000000000000000000000000000", "TOKEN");

            if (communicationType === CommunicationType.NFC) {
                toast({
                    title: "Ready to Send",
                    description: "Bring your device close to the receiver's device",
                });
                await sendNFCToken(token);
            } else if (bluetoothService) {
                toast({
                    title: "Sending Payment",
                    description: "Transferring tokens via Bluetooth...",
                });
                await bluetoothService.sendToken(token);
            }

            toast({
                title: "Payment Sent",
                description: `Successfully sent ${amount} tokens`,
            });
            setAmount("");
        } catch (error) {
            console.error("Payment error:", error);
            toast({
                title: "Payment Failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
        }
    };

    const isDisabled = () => {
        // Only disable if actively sending
        if (isSending) return true;

        if (communicationType === CommunicationType.BLUETOOTH) {
            // For Bluetooth, only disable if there's no service or not connected
            if (!bluetoothService) return true;
            if (!isConnected) return true;
            // Make sure we're in emitter mode
            if (currentRole !== "emitter") return true;
        }

        if (communicationType === CommunicationType.NFC) {
            return !isNFCReady;
        }

        return false;
    };

    return (
        <Card className="relative overflow-hidden">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Send Payment</CardTitle>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                        {communicationType === CommunicationType.BLUETOOTH ? (
                            <>
                                <Bluetooth className={`h-4 w-4 ${isConnected ? "text-green-500" : ""}`} />
                                <span className="text-sm">Bluetooth</span>
                                {isConnected && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>}
                            </>
                        ) : (
                            <>
                                <Nfc className={`h-4 w-4 ${isNFCReady ? "text-green-500" : ""}`} />
                                <span className="text-sm">NFC</span>
                                {nfcState !== "inactive" && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        {nfcState === "reading" ? "Ready" : "Sending"}
                                    </span>
                                )}
                                {deviceDetected && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full animate-pulse">Device Detected</span>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {communicationType === CommunicationType.BLUETOOTH && !isConnected && (
                    <Alert className="mb-4">
                        <Bluetooth className="h-4 w-4" />
                        <AlertDescription>Please connect to a receiver device before sending payment</AlertDescription>
                    </Alert>
                )}

                {communicationType === CommunicationType.NFC && (
                    <>
                        {!isNFCReady && (
                            <Alert className="mb-4">
                                <Smartphone className="h-4 w-4" />
                                <AlertDescription>Please enable NFC on your device to make payments</AlertDescription>
                            </Alert>
                        )}
                        {deviceDetected && (
                            <Alert className="mb-4 border-blue-200 bg-blue-50">
                                <Nfc className="h-4 w-4 text-blue-500" />
                                <AlertDescription className="text-blue-700">
                                    NFC device detected! Hold steady to complete the transfer.
                                </AlertDescription>
                            </Alert>
                        )}
                    </>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label htmlFor="amount">Amount</Label>
                            <span className="text-sm text-muted-foreground">Balance: {wallet.balance} TOKEN</span>
                        </div>

                        <div className="space-y-3">
                            <div className="relative">
                                <Input
                                    id="amount"
                                    type="text"
                                    pattern="[0-9]*"
                                    value={amount}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) {
                                            setAmount(e.target.value);
                                        }
                                    }}
                                    placeholder="Enter amount"
                                    disabled={isDisabled()}
                                    className="pr-16"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                                    <Wallet className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">TOKEN</span>
                                </div>
                            </div>

                            {amount && (
                                <div className="space-y-1">
                                    <Progress value={balancePercentage} className="h-2" />
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Remaining: {(BigInt(wallet.balance) - BigInt(amount)).toString()} TOKEN
                                        </span>
                                        <span className="text-muted-foreground">{balancePercentage.toFixed(1)}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isDisabled()}>
                        {isSending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {communicationType === CommunicationType.NFC ? "Tap Device to Send..." : "Sending..."}
                            </>
                        ) : (
                            `Send ${amount ? amount + " TOKEN" : "Payment"}`
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
