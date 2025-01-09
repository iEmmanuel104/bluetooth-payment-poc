// components/payment/payment-dashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BluetoothSetupChecker } from "@/components/bluetooth/setup-checker";
import { BluetoothStatusIndicator } from "@/components/bluetooth/status-indicator";
import { PaymentForm } from "./payment-form";
import { TokenList } from "./token-list";
import { WalletCard } from "./wallet-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PairingRole } from "@/types/bluetooth";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { SendIcon, DownloadIcon } from "lucide-react";
import { DeviceList } from "../bluetooth/device-list";
import { ReceivedPaymentNotification } from "./received-payment-notification";

export function PaymentDashboard() {
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();
    const { currentRole, bluetoothService, isConnected } = useBluetoothService();
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return null;

    const handleRoleSelect = async (role: PairingRole) => {
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

            if (role === PairingRole.EMITTER) {
                await bluetoothService.startAsEmitter();
                toast({
                    title: "Send Mode Active",
                    description: "Ready to scan for receivers",
                });
            } else if (role === PairingRole.RECEIVER) {
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
    };

    // If no role is selected, show role selection
    if (currentRole === PairingRole.NONE) {
        return (
            <div className="space-y-6">
                <WalletCard />
                <ReceivedPaymentNotification />
                <Card>
                    <CardHeader>
                        <CardTitle>Select Payment Mode</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <Button onClick={() => handleRoleSelect(PairingRole.EMITTER)} disabled={isConnecting} className="h-32">
                                <div className="flex flex-col items-center space-y-2">
                                    <SendIcon className="h-8 w-8" />
                                    <span>Send Payment</span>
                                </div>
                            </Button>
                            <Button onClick={() => handleRoleSelect(PairingRole.RECEIVER)} disabled={isConnecting} className="h-32">
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

    return (
        <div className="space-y-6">
            <WalletCard />
            <BluetoothSetupChecker />
            <BluetoothStatusIndicator />

            <DeviceList />

            {currentRole === PairingRole.EMITTER && <PaymentForm isConnected={isConnected} />}

            {currentRole === PairingRole.RECEIVER && (
                <Card>
                    <CardHeader>
                        <CardTitle>Waiting for Payment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Your device is ready to receive payments. Keep this screen open.</p>
                    </CardContent>
                </Card>
            )}

            <TokenList />

            <Button variant="destructive" onClick={() => handleRoleSelect(PairingRole.NONE)} disabled={isConnecting}>
                Reset Mode
            </Button>
        </div>
    );
}
