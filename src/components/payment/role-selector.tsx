// src/components/payment/role-selector.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { PairingRole } from "@/types/bluetooth";
import { SendIcon, DownloadIcon, XIcon } from "lucide-react";

export function PaymentRoleSelector() {
    const [isChangingRole, setIsChangingRole] = useState(false);
    const { bluetoothService } = useBluetoothService();
    const currentRole = bluetoothService?.getCurrentRole() || PairingRole.NONE;

    const handleRoleChange = async (role: PairingRole) => {
        if (!bluetoothService) return;

        setIsChangingRole(true);
        try {
            await bluetoothService.resetRole();

            if (role === PairingRole.EMITTER) {
                await bluetoothService.startAsEmitter();
            } else if (role === PairingRole.RECEIVER) {
                await bluetoothService.advertiseAsReceiver();
            }
        } catch (error) {
            console.error("Error changing role:", error);
        } finally {
            setIsChangingRole(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Mode</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant={currentRole === PairingRole.EMITTER ? "default" : "outline"}
                            onClick={() => handleRoleChange(PairingRole.EMITTER)}
                            disabled={isChangingRole}
                            className="flex items-center justify-center"
                        >
                            <SendIcon className="w-4 h-4 mr-2" />
                            Send Payment
                        </Button>

                        <Button
                            variant={currentRole === PairingRole.RECEIVER ? "default" : "outline"}
                            onClick={() => handleRoleChange(PairingRole.RECEIVER)}
                            disabled={isChangingRole}
                            className="flex items-center justify-center"
                        >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Receive Payment
                        </Button>
                    </div>

                    {currentRole !== PairingRole.NONE && (
                        <Button
                            variant="destructive"
                            onClick={() => handleRoleChange(PairingRole.NONE)}
                            disabled={isChangingRole}
                            className="flex items-center justify-center"
                        >
                            <XIcon className="w-4 h-4 mr-2" />
                            Reset Mode
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
