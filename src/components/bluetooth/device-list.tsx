// src/components/bluetooth/device-list.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bluetooth, BluetoothOff } from "lucide-react";
import { BluetoothDeviceInfo } from "@/lib/bluetooth/service";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";

export function DeviceList() {
    const [isScanning, setIsScanning] = useState(false);
    const [devices, setDevices] = useState<BluetoothDeviceInfo[]>([]);
    const { bluetoothService } = useBluetoothService();

    const startScanning = async () => {
        if (!bluetoothService) return;

        setIsScanning(true);
        try {
            const discoveredDevices = await bluetoothService.startScanning();
            setDevices(discoveredDevices);
        } catch (error) {
            console.error("Error scanning:", error);
        } finally {
            setIsScanning(false);
        }
    };

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
                {devices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground">
                        <BluetoothOff className="h-8 w-8 mb-2" />
                        <p>No devices found</p>
                        <p className="text-xs">Click scan to discover nearby devices</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {devices.map((device) => (
                            <div key={device.id} className="flex items-center justify-between p-2 border rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <Bluetooth className={`h-4 w-4 ${device.connected ? "text-green-500" : "text-blue-500"}`} />
                                    <span>{device.name}</span>
                                </div>
                                <span className={`text-sm ${device.connected ? "text-green-500" : "text-muted-foreground"}`}>
                                    {device.connected ? "Connected" : "Available"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
