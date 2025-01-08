// src/components/bluetooth/connection-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";

interface ConnectionButtonProps {
    onConnectionChange: (connected: boolean) => void;
}

export function ConnectionButton({ onConnectionChange }: ConnectionButtonProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const { isConnected, connect } = useBluetoothService();

    const handleConnect = async () => {
        if (isConnected) return;

        setIsConnecting(true);
        try {
            await connect();
            onConnectionChange(true);
        } catch (error) {
            console.error("Connection failed:", error);
            onConnectionChange(false);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <Button onClick={handleConnect} disabled={isConnecting || isConnected} className="w-40">
            {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Connect Device"}
        </Button>
    );
}
