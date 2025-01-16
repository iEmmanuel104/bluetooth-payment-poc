//src/components/bluetooth/device-list.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Bluetooth, BluetoothOff, BluetoothSearching } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PairingRole } from "@/types/bluetooth";
import type { BluetoothDeviceInfo } from "@/types";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";

interface BluetoothSetupStatus {
    available: boolean;
    message?: string;
    instructions?: string[];
}

export function DeviceList() {
    const [isScanning, setIsScanning] = useState(false);
    const [devices, setDevices] = useState<BluetoothDeviceInfo[]>([]);
    const [bluetoothStatus, setBluetoothStatus] = useState<{
        available: boolean;
        enabled: boolean;
    }>({ available: false, enabled: false });
    const [setupStatus, setSetupStatus] = useState<BluetoothSetupStatus | null>(null);

    const { isConnected, currentRole, bluetoothService } = useBluetoothService();

    const { toast } = useToast();

    useEffect(() => {
        const checkBluetoothSetup = () => {
            if (!navigator.bluetooth) {
                return {
                    available: false,
                    message: "Web Bluetooth API is not available. Please enable it in chrome://flags",
                    instructions: [
                        "1. Open chrome://flags in your browser",
                        "2. Search for 'Bluetooth'",
                        "3. Enable 'Experimental Web Platform features' and 'Web Bluetooth'",
                        "4. Restart your browser",
                    ],
                };
            }
            return { available: true };
        };

        setSetupStatus(checkBluetoothSetup());
    }, []);

    useEffect(() => {
        if (!bluetoothService) return;

        const checkStatus = async () => {
            const result = await bluetoothService.checkAvailability();
            setBluetoothStatus(result);
        };

        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [bluetoothService]);

    useEffect(() => {
        if (bluetoothService && currentRole === PairingRole.EMITTER) {
            const handleDeviceDiscovered = (device: BluetoothDeviceInfo) => {
                setDevices((prev) => {
                    const exists = prev.some((d) => d.id === device.id);
                    if (!exists) {
                        return [...prev, device];
                    }
                    return prev;
                });
            };

            const handleDeviceDisconnected = (device: BluetoothDeviceInfo) => {
                setDevices((prev) => prev.filter((d) => d.id !== device.id));
            };

            bluetoothService.on("deviceDiscovered", handleDeviceDiscovered);
            bluetoothService.on("deviceDisconnected", handleDeviceDisconnected);

            return () => {
                bluetoothService.off("deviceDiscovered", handleDeviceDiscovered);
                bluetoothService.off("deviceDisconnected", handleDeviceDisconnected);
            };
        }
    }, [bluetoothService, currentRole]);

    const getStatusDisplay = () => {
        if (!bluetoothStatus.available) return "Bluetooth Not Available";
        if (!bluetoothStatus.enabled) return "Bluetooth Disabled";
        if (isConnected) {
            return currentRole === PairingRole.EMITTER ? "Connected to Receiver" : "Connected with Sender";
        }
        if (currentRole === PairingRole.RECEIVER) {
            return "Waiting for Sender";
        }
        return "Bluetooth Devices";
    };

    const getStatusDescription = () => {
        if (!bluetoothStatus.available) return "Your device doesn't support Bluetooth";
        if (!bluetoothStatus.enabled) return "Please enable Bluetooth on your device";
        if (isConnected) return "Device is paired and ready";
        if (currentRole === PairingRole.RECEIVER) {
            return "Select a sender device when prompted";
        }
        return "Scan to discover nearby devices";
    };

    const renderReceiverContent = () => (
        <div className="p-4 rounded-lg space-y-4">
            <div className="flex items-center justify-center">
                <div className="animate-pulse">
                    <BluetoothSearching className="h-8 w-8 text-blue-500" />
                </div>
            </div>
            <p className="text-center text-muted-foreground">
                {isConnected
                    ? "Connected with sender. Ready to receive payments."
                    : "Waiting for sender connection. When prompted, select the sender's device."}
            </p>
            {!isConnected && (
                <Alert>
                    <AlertDescription>
                        When the sender initiates the connection, you&apos;ll be prompted to select their device. Make sure to accept the connection
                        request when it appears.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );

    const renderEmitterContent = () => (
        <div className="space-y-2">
            {devices.length === 0 ? (
                <div className="p-4 rounded-lg">
                    <p className="text-center text-muted-foreground">No devices found. Click scan to discover nearby devices.</p>
                </div>
            ) : (
                devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg transition-colors">
                        <div className="flex items-center space-x-3">
                            <Bluetooth className="h-4 w-4 text-blue-500" />
                            <span>{device.name || "Unknown Device"}</span>
                        </div>
                        <Button size="sm" onClick={() => connectToDevice(device.id)} disabled={device.connected}>
                            {device.connected ? "Connected" : "Connect"}
                        </Button>
                    </div>
                ))
            )}
        </div>
    );

    const startScanning = async () => {
        if (!bluetoothService) return;

        setIsScanning(true);
        try {
            const discoveredDevices = await bluetoothService.startScanning();
            setDevices(discoveredDevices);
        } catch (error) {
            console.error("Error scanning:", error);
            toast({
                title: "Scanning Failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsScanning(false);
        }
    };

    const connectToDevice = async (deviceId: string) => {
        if (!bluetoothService) return;

        try {
            await bluetoothService.connectToDevice(deviceId);
            toast({
                title: "Connected",
                description: "Successfully connected to device",
            });
        } catch (error) {
            toast({
                title: "Connection Failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        }
    };

    if (setupStatus && !setupStatus.available) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Bluetooth Setup Required</CardTitle>
                </CardHeader>
                <CardContent>{/* ... (keep existing setup status content) ... */}</CardContent>
            </Card>
        );
    }

    const shouldShowScanButton = bluetoothStatus.enabled && currentRole === PairingRole.EMITTER && !isConnected;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full">
                        {!bluetoothStatus.available ? (
                            <BluetoothOff className="h-5 w-5 text-slate-500" />
                        ) : !bluetoothStatus.enabled ? (
                            <Bluetooth className="h-5 w-5 text-slate-500" />
                        ) : isConnected ? (
                            <Bluetooth className="h-5 w-5 text-green-500" />
                        ) : (
                            <BluetoothSearching className="h-5 w-5 text-blue-500" />
                        )}
                    </div>
                    <div>
                        <CardTitle>{getStatusDisplay()}</CardTitle>
                        <p className="text-sm text-muted-foreground">{getStatusDescription()}</p>
                    </div>
                </div>
                {shouldShowScanButton && (
                    <Button onClick={startScanning} disabled={isScanning} variant="outline" size="sm">
                        {isScanning ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Scanning...
                            </>
                        ) : (
                            "Scan for Devices"
                        )}
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {currentRole === PairingRole.RECEIVER
                    ? renderReceiverContent()
                    : bluetoothStatus.enabled && !isConnected
                    ? renderEmitterContent()
                    : null}
            </CardContent>
        </Card>
    );
}