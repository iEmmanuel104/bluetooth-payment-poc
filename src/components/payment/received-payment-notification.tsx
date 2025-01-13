// components/payment/received-payment-notification.tsx
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { useNFCService } from "@/lib/hooks/use-nfc";
import { Token } from "@/types";

export function ReceivedPaymentNotification() {
    const { toast } = useToast();
    const { bluetoothService } = useBluetoothService();
    const { nfcService } = useNFCService();

    useEffect(() => {
        const handlePaymentReceived = (token: Token) => {
            toast({
                title: "Payment Received!",
                description: `Amount: ${token.amount}`,
                variant: "default",
            });
        };

        const handleDeviceDetected = (device: any) => {
            toast({
                title: "Device Detected",
                description: "Ready to transfer payment",
                variant: "default",
            });
        };

        // Set up bluetooth listeners
        if (bluetoothService) {
            bluetoothService.on("paymentReceived", handlePaymentReceived);
        }

        // Set up NFC listeners
        if (nfcService) {
            nfcService.on("paymentReceived", handlePaymentReceived);
            nfcService.on("deviceDetected", handleDeviceDetected);
        }

        return () => {
            if (bluetoothService) {
                bluetoothService.off("paymentReceived", handlePaymentReceived);
            }
            if (nfcService) {
                nfcService.off("paymentReceived", handlePaymentReceived);
                nfcService.off("deviceDetected", handleDeviceDetected);
            }
        };
    }, [bluetoothService, nfcService, toast]);

    return null;
}
