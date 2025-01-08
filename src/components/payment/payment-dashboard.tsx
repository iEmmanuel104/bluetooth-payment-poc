// components/payment/payment-dashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionButton } from "@/components/bluetooth/connection-button";
import { BluetoothSetupChecker } from "@/components/bluetooth/setup-checker";
import { PaymentForm } from "./payment-form";
import { TokenList } from "./token-list";
import { WalletCard } from "./wallet-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { DeviceList } from "../bluetooth/device-list";
import { BluetoothStatusIndicator } from "../bluetooth/status-indicator";
import { PairingRole } from "@/types/bluetooth";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { PaymentRoleSelector } from "./role-selector";

export function PaymentDashboard() {
    const [isConnected, setIsConnected] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();
    const { currentRole, bluetoothService } = useBluetoothService();

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleConnectionChange = (connected: boolean) => {
        setIsConnected(connected);
        toast({
            title: connected ? "Connected" : "Disconnected",
            description: connected ? "Device connected successfully" : "Device disconnected",
            variant: connected ? "default" : "destructive",
        });
    };

    if (!isClient) {
        return null;
    }

    const renderBluetoothControls = () => {
        if (currentRole === PairingRole.NONE) {
            return null;
        }

        return (
            <>
                <BluetoothSetupChecker />
                <BluetoothStatusIndicator />

                <div className="grid gap-6 md:grid-cols-2">
                    <DeviceList />
                    <Card>
                        <CardHeader>
                            <CardTitle>{currentRole === PairingRole.EMITTER ? "Send Payment" : "Receive Payment"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4">
                                <ConnectionButton onConnectionChange={handleConnectionChange} />
                                {!isConnected && (
                                    <Alert variant="destructive" className="w-full">
                                        <AlertDescription>
                                            Please connect to a device to {currentRole === PairingRole.EMITTER ? "send" : "receive"} payments
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    };

    const renderPaymentControls = () => {
        if (!isConnected || currentRole === PairingRole.NONE) {
            return null;
        }

        return (
            <div className="grid gap-6 md:grid-cols-2">
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
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Always show wallet and role selector */}
            <div className="grid gap-6 md:grid-cols-2">
                <WalletCard />
                <PaymentRoleSelector />
            </div>

            {/* Show Bluetooth controls only after role selection */}
            {renderBluetoothControls()}

            {/* Show payment controls only after connection */}
            {renderPaymentControls()}
        </div>
    );
}
