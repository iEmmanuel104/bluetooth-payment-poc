//src/components/bluetooth/device-list.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Bluetooth, BluetoothOff, BluetoothSearching, Nfc } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PairingRole } from "@/types/bluetooth";
import type { BluetoothDeviceInfo } from '@/types';
import { BluetoothService } from "@/lib/bluetooth/service";
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

    const { isConnected, currentRole, bluetoothService} = useBluetoothService();

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
        if (bluetoothService instanceof BluetoothService && currentRole === PairingRole.EMITTER) {
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
                <CardContent>
                    <Alert variant="destructive">
                        <AlertTitle>Bluetooth Not Available</AlertTitle>
                        <AlertDescription>
                            <div className="space-y-2">
                                <p>{setupStatus.message}</p>
                                {setupStatus.instructions && (
                                    <div className="mt-2">
                                        <p className="font-semibold">Setup Instructions:</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            {setupStatus.instructions.map((instruction, index) => (
                                                <li key={index}>{instruction}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <Button variant="outline" onClick={() => window.open("chrome://flags", "_blank")} className="mt-2">
                                    Open Chrome Flags
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

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
                        <CardTitle>
                            {!bluetoothStatus.available
                                ? "Bluetooth Not Available"
                                : !bluetoothStatus.enabled
                                ? "Bluetooth Disabled"
                                : isConnected
                                ? `Connected ${currentRole === "emitter" ? "to Receiver" : "with Sender"}`
                                : currentRole === "receiver"
                                ? "Waiting for Connection"
                                : "Bluetooth Devices"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {!bluetoothStatus.available
                                ? "Your device doesn't support Bluetooth"
                                : !bluetoothStatus.enabled
                                ? "Please enable Bluetooth on your device"
                                : isConnected
                                ? "Device is paired and ready"
                                : currentRole === "receiver"
                                ? "Waiting for sender to connect"
                                : "Scan to discover nearby devices"}
                        </p>
                    </div>
                </div>
                {currentRole === PairingRole.EMITTER && bluetoothStatus.enabled && (
                    <Button onClick={startScanning} disabled={isScanning || isConnected} variant="outline" size="sm">
                        {isScanning ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Scanning...
                            </>
                        ) : isConnected ? (
                            "Connected"
                        ) : (
                            "Scan for Devices"
                        )}
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {currentRole === PairingRole.RECEIVER ? (
                    <div className="p-4 rounded-lg">
                        <p className="text-center text-muted-foreground">Your device is visible to others and ready to receive connections.</p>
                    </div>
                ) : bluetoothStatus.enabled && !isConnected ? (
                    <div className="space-y-2">
                        {devices.length === 0 ? (
                            <div className="p-4 rounded-lg">
                                <p className="text-center text-muted-foreground">No devices found. Click scan to discover nearby devices.</p>
                            </div>
                        ) : (
                            devices.map((device) => (
                                <div
                                    key={device.id}
                                    className="flex items-center justify-between p-3 border rounded-lg transition-colors"
                                >
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
                ) : null}
            </CardContent>
        </Card>
    );
}

export default DeviceList;
