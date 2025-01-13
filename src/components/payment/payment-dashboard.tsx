// components/payment/payment-dashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentForm } from "./payment-form";
import { TokenList } from "./token-list";
import { WalletCard } from "./wallet-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { SendIcon, DownloadIcon, Bluetooth, Nfc } from "lucide-react";
import { DeviceList } from "../bluetooth/device-list";
import { ReceivedPaymentNotification } from "./received-payment-notification";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { useNFCService } from "@/lib/hooks/use-nfc";
import { CommunicationType } from "@/types";
import { Alert, AlertDescription } from "../ui/alert";
// import { PairingRole } from "@/types/bluetooth";

type PaymentMode = "none" | "sending" | "receiving";

export function PaymentDashboard() {
    const [isClient, setIsClient] = useState(false);
    const [communicationType, setCommunicationType] = useState<CommunicationType>(CommunicationType.BLUETOOTH);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>("none");
    const { toast } = useToast();
    const [isConnecting, setIsConnecting] = useState(false);

    // Service hooks
    const { isConnected: isBluetoothConnected, bluetoothService } = useBluetoothService();

    const { isReady: isNFCReady, state: nfcState, deviceDetected, startReading, stop, onTokenReceived } = useNFCService();

    // Determine current connection state based on active communication type
    const isConnected = communicationType === CommunicationType.BLUETOOTH ? isBluetoothConnected : isNFCReady;

    useEffect(() => {
        setIsClient(true);

        // Set up NFC token received listener
        if (communicationType === CommunicationType.NFC) {
            const unsubscribe = onTokenReceived((token) => {
                toast({
                    title: "Payment Received",
                    description: `Received ${token.amount} tokens`,
                });
            });

            return () => {
                unsubscribe();
                stop().catch(console.error);
            };
        }
    }, [communicationType]);

    if (!isClient) return null;

    const handleModeSelect = async (mode: PaymentMode) => {
        if (communicationType === CommunicationType.BLUETOOTH) {
            if (!bluetoothService) {
                toast({
                    title: "Error",
                    description: "Bluetooth service not available",
                    variant: "destructive",
                });
                return;
            }

            setIsConnecting(true);
            try {
                await bluetoothService.resetRole();

                if (mode === "sending") {
                    await bluetoothService.startAsEmitter();
                    toast({
                        title: "Send Mode Active",
                        description: "Ready to scan for receivers",
                    });
                } else if (mode === "receiving") {
                    await bluetoothService.advertiseAsReceiver();
                    toast({
                        title: "Receive Mode Active",
                        description: "Ready to receive payments",
                    });
                }
            } catch (error) {
                console.error("Error:", error);
                toast({
                    title: "Error",
                    description: (error as Error).message,
                    variant: "destructive",
                });
            } finally {
                setIsConnecting(false);
            }
        } else {
            // NFC mode
            try {
                if (mode === "receiving") {
                    await startReading();
                    toast({
                        title: "Receive Mode Active",
                        description: "Ready to receive NFC payments",
                    });
                }
                // For sending mode, the NFC reading will be handled by the PaymentForm
            } catch (error) {
                console.error("Error:", error);
                toast({
                    title: "Error",
                    description: (error as Error).message,
                    variant: "destructive",
                });
                return;
            }
        }

        setPaymentMode(mode);
    };

    const toggleCommunicationType = async () => {
        // Reset current mode
        if (communicationType === CommunicationType.NFC) {
            await stop();
        } else if (bluetoothService) {
            await bluetoothService.resetRole();
        }

        setCommunicationType((prev) => (prev === CommunicationType.BLUETOOTH ? CommunicationType.NFC : CommunicationType.BLUETOOTH));
        setPaymentMode("none");
    };

    // Mode selection view
    if (paymentMode === "none") {
        return (
            <div className="space-y-6">
                <WalletCard />
                <ReceivedPaymentNotification />
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Select Payment Mode</CardTitle>
                            <Button variant="outline" size="sm" className="h-12 w-12" onClick={toggleCommunicationType}>
                                {communicationType === CommunicationType.BLUETOOTH ? <Bluetooth className="h-4 w-4" /> : <Nfc className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <Button onClick={() => handleModeSelect("sending")} disabled={isConnecting} className="h-32">
                                <div className="flex flex-col items-center space-y-2">
                                    <SendIcon className="h-8 w-8" />
                                    <span>Send Payment</span>
                                </div>
                            </Button>
                            <Button onClick={() => handleModeSelect("receiving")} disabled={isConnecting} className="h-32">
                                <div className="flex flex-col items-center space-y-2">
                                    <DownloadIcon className="h-8 w-8" />
                                    <span>Receive Payment</span>
                                </div>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const renderNFCCard = () => (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{paymentMode === "sending" ? "Ready to Send" : "Ready to Receive"}</CardTitle>
                    {deviceDetected && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2 animate-pulse">
                            <Nfc className="h-3 w-3" />
                            Device Detected
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {deviceDetected ? (
                        <Alert className="border-blue-200 bg-blue-50">
                            <Nfc className="h-4 w-4 text-blue-500" />
                            <AlertDescription className="text-blue-700">
                                NFC device detected! {paymentMode === "sending" ? "Complete the payment to transfer." : "Waiting for payment data..."}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <p className="text-muted-foreground">
                            Hold your device close to the {paymentMode === "sending" ? "receiver's" : "sender's"} device
                        </p>
                    )}
                    {paymentMode === "sending" && <PaymentForm isConnected={isConnected} communicationType={communicationType} />}
                    {nfcState !== "inactive" && !deviceDetected && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                            <Nfc className="h-4 w-4" />
                            NFC {nfcState === "reading" ? "Ready" : "Active"}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    // Active mode view
    return (
        <div className="space-y-6">
            <WalletCard />
            <div className="flex justify-end">
                <Button variant="outline" size="sm" className="h-12 w-12" onClick={toggleCommunicationType}>
                    {communicationType === CommunicationType.BLUETOOTH ? <Bluetooth className="h-4 w-4" /> : <Nfc className="h-4 w-4" />}
                </Button>
            </div>

            {communicationType === CommunicationType.BLUETOOTH ? (
                <>
                    <DeviceList />
                    {paymentMode === "sending" && <PaymentForm isConnected={isConnected} communicationType={communicationType} />}

                    {paymentMode === "receiving" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Waiting for Payment</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Your device is ready to receive payments. Keep this screen open.</p>
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                renderNFCCard()
            )}

            <TokenList />
            <ReceivedPaymentNotification />

            <Button variant="destructive" onClick={() => handleModeSelect("none")} disabled={isConnecting}>
                Reset Mode
            </Button>
        </div>
    );
}
