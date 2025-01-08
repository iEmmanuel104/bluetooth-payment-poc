import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Token } from "@/types";
import { Database } from "@/lib/db";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { PairingRole } from "@/types/bluetooth";

const db = new Database();

export function TokenList() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const { currentRole } = useBluetoothService();

    useEffect(() => {
        const loadTokens = async () => {
            await db.initialize();
            const savedTokens = await db.getTokens();
            setTokens(savedTokens);
        };

        loadTokens();
    }, []);

    // Show different titles based on the role
    const getTitle = () => {
        switch (currentRole) {
            case PairingRole.EMITTER:
                return "Sent Payments";
            case PairingRole.RECEIVER:
                return "Received Payments";
            default:
                return "Transaction History";
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{getTitle()}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {tokens.length === 0 ? (
                        <p className="text-muted-foreground">No transactions yet</p>
                    ) : (
                        <div className="grid gap-4">
                            {tokens.map((token) => (
                                <div key={token.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-medium">Amount: {token.amount}</p>
                                        <p className="text-sm text-muted-foreground">{new Date(token.issueDate).toLocaleString()}</p>
                                    </div>
                                    <span
                                        className={`px-2 py-1 text-xs rounded-full ${
                                            token.status === "active"
                                                ? "bg-green-100 text-green-800"
                                                : token.status === "spent"
                                                ? "bg-gray-100 text-gray-800"
                                                : "bg-red-100 text-red-800"
                                        }`}
                                    >
                                        {token.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
