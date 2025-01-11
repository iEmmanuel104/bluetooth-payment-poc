// components/payment/payment-dashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentForm } from "./payment-form";
import { TokenList } from "./token-list";
import { WalletCard } from "./wallet-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PairingRole } from "@/types/bluetooth";
import { SendIcon, DownloadIcon, Bluetooth, Nfc } from "lucide-react";
import { DeviceList } from "../bluetooth/device-list";
import { ReceivedPaymentNotification } from "./received-payment-notification";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { useNFCService } from "@/lib/hooks/use-nfc";
import { CommunicationType } from '@/types';

export function PaymentDashboard() {
    const [isClient, setIsClient] = useState(false);
    const [communicationType, setCommunicationType] = useState<CommunicationType>(CommunicationType.BLUETOOTH);
    const { toast } = useToast();
    const [isConnecting, setIsConnecting] = useState(false);

    // Service hooks
    const { 
        isConnected: isBluetoothConnected, 
        currentRole: bluetoothRole, 
        bluetoothService 
    } = useBluetoothService();

    const { 
        isReady: isNFCReady, 
        currentRole: nfcRole, 
        nfcService 
    } = useNFCService();

    // Determine current connection state based on active communication type
    const currentRole = communicationType === CommunicationType.BLUETOOTH ? bluetoothRole : nfcRole;
    const service = communicationType === CommunicationType.BLUETOOTH ? bluetoothService : nfcService;
    const isConnected = communicationType === CommunicationType.BLUETOOTH ? isBluetoothConnected : isNFCReady;

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return null;

    const handleRoleSelect = async (role: PairingRole) => {
        if (!service) {
            toast({
                title: "Error",
                description: `${communicationType} service not available`,
                variant: "destructive",
            });
            return;
        }

        setIsConnecting(true);
        try {
            await service.resetRole();

            if (role === PairingRole.EMITTER) {
                await service.startAsEmitter();
                toast({
                    title: "Send Mode Active",
                    description: communicationType === CommunicationType.BLUETOOTH 
                        ? "Ready to scan for receivers" 
                        : "Ready to send payments via NFC",
                });
            } else if (role === PairingRole.RECEIVER) {
                await service.advertiseAsReceiver();
                toast({
                    title: "Receive Mode Active",
                    description: communicationType === CommunicationType.BLUETOOTH 
                        ? "Ready to receive payments" 
                        : "Ready to receive payments via NFC",
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

    const toggleCommunicationType = () => {
        // Reset current role when switching communication types
        if (service) {
            service.resetRole().catch(console.error);
        }
        
        setCommunicationType(prev => 
            prev === CommunicationType.BLUETOOTH ? CommunicationType.NFC : CommunicationType.BLUETOOTH
        );
    };

    // Role selection view
    if (currentRole === PairingRole.NONE) {
        return (
            <div className="space-y-6">
                <WalletCard />
                <ReceivedPaymentNotification />
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Select Payment Mode</CardTitle>
                            <Button variant="outline" size="sm" className="h-12 w-12" onClick={toggleCommunicationType}>
                                {communicationType === CommunicationType.BLUETOOTH ? (
                                    <Bluetooth className="h-4 w-4" />
                                ) : (
                                    <Nfc className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
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

    // Active mode view
    return (
        <div className="space-y-6">
            <WalletCard />
            <div className="flex justify-end">
                <Button variant="outline" size="sm" className="h-12 w-12" onClick={toggleCommunicationType}>
                    {communicationType === CommunicationType.BLUETOOTH ? (
                        <Bluetooth className="h-4 w-4" />
                    ) : (
                        <Nfc className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {communicationType === CommunicationType.BLUETOOTH && (
                <>
                    <DeviceList />
                    {currentRole === PairingRole.EMITTER && (
                        <PaymentForm isConnected={isConnected} communicationType={communicationType}/>
                    )}

                    {currentRole === PairingRole.RECEIVER && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Waiting for Payment</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Your device is ready to receive payments. Keep this screen open.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {communicationType === CommunicationType.NFC && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {currentRole === PairingRole.EMITTER ? "Ready to Send" : "Ready to Receive"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-muted-foreground">
                                Hold your device close to the {currentRole === PairingRole.EMITTER ? "receiver's" : "sender's"} device
                            </p>
                            {currentRole === PairingRole.EMITTER && (
                                <PaymentForm isConnected={isConnected} communicationType={communicationType}/>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <TokenList />
            <ReceivedPaymentNotification />

            <Button variant="destructive" onClick={() => handleRoleSelect(PairingRole.NONE)} disabled={isConnecting}>
                Reset Mode
            </Button>
        </div>
    );
}