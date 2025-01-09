// components/bluetooth/device-list.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bluetooth } from "lucide-react";
import { BluetoothDeviceInfo } from "@/lib/bluetooth/service";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { useToast } from "@/components/ui/use-toast";
import { PairingRole } from "@/types/bluetooth";

export function DeviceList() {
    const [isScanning, setIsScanning] = useState(false);
    const [devices, setDevices] = useState<BluetoothDeviceInfo[]>([]);
    const { bluetoothService, currentRole } = useBluetoothService();
    const { toast } = useToast();

    useEffect(() => {
        if (bluetoothService && currentRole === PairingRole.EMITTER) {
            // Set up device discovery listener
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

    if (currentRole === PairingRole.RECEIVER) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Device Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Your device is visible to others and ready to receive connections.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Available Devices</CardTitle>
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
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {devices.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No devices found. Click scan to discover nearby devices.</p>
                    ) : (
                        devices.map((device) => (
                            <div
                                key={device.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
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
            </CardContent>
        </Card>
    );
}
