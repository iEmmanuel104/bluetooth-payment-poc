// components/payment/payment-dashboard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionButton } from "@/components/bluetooth/connection-button";
import { PaymentForm } from "./payment-form";
import { TokenList } from "./token-list";
import { WalletCard } from "./wallet-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

export function PaymentDashboard() {
    const [isConnected, setIsConnected] = useState(false);
    const { toast } = useToast();

    const handleConnectionChange = (connected: boolean) => {
        setIsConnected(connected);
        toast({
            title: connected ? "Connected" : "Disconnected",
            description: connected ? "Device connected successfully" : "Device disconnected",
            variant: connected ? "default" : "destructive",
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Bluetooth Payment System</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-4">
                        <ConnectionButton onConnectionChange={handleConnectionChange} />
                        {!isConnected && (
                            <Alert variant="destructive" className="w-full">
                                <AlertDescription>Please connect to a device to make payments</AlertDescription>
                            </Alert>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <WalletCard />
                <PaymentForm isConnected={isConnected} />
            </div>

            <TokenList />
        </div>
    );
}
