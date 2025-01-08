// components/payment/payment-form.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";

interface PaymentFormProps {
    isConnected: boolean;
}

export function PaymentForm({ isConnected }: PaymentFormProps) {
    const [amount, setAmount] = useState("");
    const { toast } = useToast();
    const { wallet, createToken } = useWallet();
    const { sendToken } = useBluetoothService();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || !isConnected) return;

        try {
            const token = await createToken(Number(amount));
            await sendToken(token);

            toast({
                title: "Payment Sent",
                description: `Successfully sent ${amount} tokens`,
            });

            setAmount("");
        } catch (error) {
            toast({
                title: "Payment Failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Send Payment</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            min="0"
                            step="0.01"
                            disabled={!isConnected}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={!isConnected || !amount || Number(amount) > wallet.balance}>
                        Send Payment
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
