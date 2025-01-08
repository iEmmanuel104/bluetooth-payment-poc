// src/components/bluetooth/status-indicator.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Bluetooth, BluetoothOff, BluetoothSearching } from "lucide-react";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { BluetoothDeviceInfo } from "@/lib/bluetooth/service";

export function BluetoothStatusIndicator() {
    const [status, setStatus] = useState<{
        available: boolean;
        enabled: boolean;
    }>({ available: false, enabled: false });

    const { bluetoothService } = useBluetoothService();
    const [currentDevice, setCurrentDevice] = useState<BluetoothDeviceInfo | null>(null);

    useEffect(() => {
        if (!bluetoothService) return;

        const checkStatus = async () => {
            const result = await bluetoothService.checkAvailability();
            setStatus(result);
            setCurrentDevice(bluetoothService.getCurrentDevice());
        };

        checkStatus();

        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [bluetoothService]);

    return (
        <Card>
            <CardContent className="flex items-center space-x-4 py-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100">
                    {!status.available ? (
                        <BluetoothOff className="h-5 w-5 text-slate-500" />
                    ) : !status.enabled ? (
                        <Bluetooth className="h-5 w-5 text-slate-500" />
                    ) : currentDevice ? (
                        <Bluetooth className="h-5 w-5 text-green-500" />
                    ) : (
                        <BluetoothSearching className="h-5 w-5 text-blue-500" />
                    )}
                </div>
                <div>
                    <h3 className="font-medium">
                        {!status.available
                            ? "Bluetooth Not Available"
                            : !status.enabled
                            ? "Bluetooth Disabled"
                            : currentDevice
                            ? `Connected to ${currentDevice.name}`
                            : "Ready to Connect"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {!status.available
                            ? "Your device doesn't support Bluetooth"
                            : !status.enabled
                            ? "Please enable Bluetooth on your device"
                            : currentDevice
                            ? "Device is paired and ready"
                            : "Discoverable by other devices"}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
