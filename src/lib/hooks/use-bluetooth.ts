// lib/hooks/use-bluetooth.ts
import { useEffect, useState } from "react";
import { BluetoothService } from "@/lib/bluetooth/service";
import { Token } from "@/types";

export function useBluetoothService() {
    const [service] = useState(() => new BluetoothService());
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        service.on("connectionChange", (connected: boolean) => {
            setIsConnected(connected);
        });
    }, [service]);

    return {
        isConnected,
        connect: () => service.connect(),
        sendToken: (token: Token) => service.sendToken(token),
    };
}