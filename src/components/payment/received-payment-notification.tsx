// components/payment/received-payment-notification.tsx
import { useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { useNFCService } from "@/lib/hooks/use-nfc";
import { OfflineToken } from "@/lib/blockchain/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Bluetooth, Nfc } from "lucide-react";

export function ReceivedPaymentNotification() {
    const { toast } = useToast();
    const { bluetoothService, isConnected } = useBluetoothService();
    const { onTokenReceived, deviceDetected, isReady: isNFCReady, state: nfcState } = useNFCService();

    const handlePaymentReceived = useCallback(
        (token: OfflineToken) => {
            toast({
                title: "Payment Received!",
                description: `Successfully received ${token.amount} tokens`,
                variant: "default",
                duration: 5000,
            });
        },
        [toast]
    );

    useEffect(() => {
        // Set up bluetooth listeners
        if (bluetoothService) {
            bluetoothService.on("paymentReceived", handlePaymentReceived);
            return () => {
                bluetoothService.off("paymentReceived", handlePaymentReceived);
            };
        }
    }, [bluetoothService, handlePaymentReceived]);

    useEffect(() => {
        // Set up NFC payment listener
        const unsubscribe = onTokenReceived(handlePaymentReceived);
        return () => {
            unsubscribe();
        };
    }, [onTokenReceived, handlePaymentReceived]);

    // Only render visual feedback when actively receiving or a device is detected
    if (!deviceDetected && nfcState !== "reading") return null;

    return (
        <Card className="w-full p-4">
            {deviceDetected && (
                <Alert className="mb-2 border-blue-200 bg-blue-50">
                    <Nfc className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-700">NFC device detected! Ready to receive payment.</AlertDescription>
                </Alert>
            )}

            {nfcState === "reading" && isNFCReady && (
                <Alert className="border-green-200 bg-green-50">
                    <div className="flex items-center gap-2">
                        <Nfc className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-700">Waiting for payment...</AlertDescription>
                    </div>
                </Alert>
            )}

            {bluetoothService && isConnected && (
                <Alert className="mt-2 border-blue-200 bg-blue-50">
                    <div className="flex items-center gap-2">
                        <Bluetooth className="h-4 w-4 text-blue-500" />
                        <AlertDescription className="text-blue-700">Bluetooth connected. Ready to receive payment.</AlertDescription>
                    </div>
                </Alert>
            )}
        </Card>
    );
}
