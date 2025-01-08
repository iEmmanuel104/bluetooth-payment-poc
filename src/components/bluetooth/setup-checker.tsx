// src/components/bluetooth/setup-checker.tsx
"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface BluetoothStatus {
    available: boolean;
    message?: string;
    instructions?: string[];
}

export function BluetoothSetupChecker() {
    const [status, setStatus] = useState<BluetoothStatus | null>(null);

    useEffect(() => {
        const checkBluetoothAvailability = () => {
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

        setStatus(checkBluetoothAvailability());
    }, []);

    // Don't render anything during SSR or initial client render
    if (!status) {
        return null;
    }

    // Don't render if Bluetooth is available
    if (status.available) {
        return null;
    }

    return (
        <Alert variant="destructive" className="mb-4">
            <AlertTitle>Bluetooth Not Available</AlertTitle>
            <AlertDescription>
                <div className="space-y-2">
                    <p>{status.message}</p>
                    {status.instructions && (
                        <div className="mt-2">
                            <p className="font-semibold">Setup Instructions:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                {status.instructions.map((instruction, index) => (
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
    );
}
