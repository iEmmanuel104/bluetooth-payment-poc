// components/payment/payment-form.tsx
"use client";

import { useState, useEffect } from "react";
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
import { Bluetooth, Loader2, Nfc, Smartphone } from "lucide-react";

interface PaymentFormProps {
    isConnected: boolean;
    communicationType: CommunicationType;
}

export function PaymentForm({ isConnected, communicationType }: PaymentFormProps) {
    const [amount, setAmount] = useState("");
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const { wallet, createToken } = useWallet();
    const { bluetoothService } = useBluetoothService();
    const { isReady: isNFCReady, state: nfcState, deviceDetected, sendToken: sendNFCToken, startReading, stop } = useNFCService();

    useEffect(() => {
        // Start NFC reading when component mounts if using NFC
        if (communicationType === CommunicationType.NFC && isNFCReady) {
            startReading().catch(console.error);
        }

        // Cleanup
        return () => {
            if (communicationType === CommunicationType.NFC) {
                stop().catch(console.error);
            }
        };
    }, [communicationType, isNFCReady]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || (!isConnected && communicationType === CommunicationType.BLUETOOTH)) return;

        if (communicationType === CommunicationType.NFC && !isNFCReady) {
            toast({
                title: "NFC Not Available",
                description: "Please enable NFC on your device",
                variant: "destructive",
            });
            return;
        }

        setIsSending(true);
        try {
            const token = await createToken(amount);

            if (communicationType === CommunicationType.NFC) {
                toast({
                    title: "Ready to Send",
                    description: "Bring your device close to the receiver's device",
                });
                await sendNFCToken(token);
            } else if (bluetoothService) {
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

    const isAmountTooLarge = (amount: string, balance: string): boolean => {
        try {
            return BigInt(amount) > BigInt(balance);
        } catch {
            return false;
        }
    };

    const getSubmitButtonStatus = () => {
        if (communicationType === CommunicationType.BLUETOOTH) {
            return !isConnected || !amount || isAmountTooLarge(amount, wallet.balance) || isSending;
        }
        return !amount || !isNFCReady || isAmountTooLarge(amount, wallet.balance) || isSending;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Send Payment</CardTitle>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                        {communicationType === CommunicationType.BLUETOOTH ? (
                            <>
                                <Bluetooth className={`h-4 w-4 ${isConnected ? "text-green-500" : ""}`} />
                                <span className="text-sm">Bluetooth</span>
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
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
                                disabled={isSending || (communicationType === CommunicationType.BLUETOOTH && !isConnected)}
                                className="pr-16"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">TOKEN</span>
                        </div>
                        {amount && (
                            <p className="text-sm text-muted-foreground">
                                Balance after transfer: {wallet.balance && amount ? (BigInt(wallet.balance) - BigInt(amount)).toString() : "0"} TOKEN
                            </p>
                        )}
                    </div>
                    <Button type="submit" className="w-full" disabled={getSubmitButtonStatus()}>
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
