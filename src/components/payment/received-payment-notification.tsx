// components/payment/received-payment-notification.tsx
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { Token } from "@/types";

export function ReceivedPaymentNotification() {
    const { toast } = useToast();
    const { bluetoothService } = useBluetoothService();

    useEffect(() => {
        if (!bluetoothService) return;

        const handlePaymentReceived = (token: Token) => {
            toast({
                title: "Payment Received!",
                description: `Amount: ${token.amount}`,
                variant: "default",
            });

            // Acknowledge receipt
            bluetoothService.acknowledgePayment(token).catch((error) => {
                console.error("Error acknowledging payment:", error);
            });
        };

        bluetoothService.on("paymentReceived", handlePaymentReceived);

        return () => {
            bluetoothService.off("paymentReceived", handlePaymentReceived);
        };
    }, [bluetoothService, toast]);

    return null;
}
