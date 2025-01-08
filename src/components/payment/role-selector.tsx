import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBluetoothService } from "@/lib/hooks/use-bluetooth";
import { PairingRole } from "@/types/bluetooth";
import { SendIcon, DownloadIcon, XIcon, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function PaymentRoleSelector() {
    const [isChangingRole, setIsChangingRole] = useState(false);
    const { bluetoothService, currentRole } = useBluetoothService();
    const { toast } = useToast();

    const handleRoleChange = async (role: PairingRole) => {
        if (!bluetoothService) {
            toast({
                title: "Error",
                description: "Bluetooth service not available",
                variant: "destructive",
            });
            return;
        }

        setIsChangingRole(true);
        try {
            console.log("Current role:", currentRole);
            console.log("Changing to role:", role);

            await bluetoothService.resetRole();

            if (role === PairingRole.EMITTER) {
                await bluetoothService.startAsEmitter();
                toast({
                    title: "Send Mode Active",
                    description: "Ready to send payments",
                });
            } else if (role === PairingRole.RECEIVER) {
                await bluetoothService.advertiseAsReceiver();
                toast({
                    title: "Receive Mode Active",
                    description: "Ready to receive payments",
                });
            }
        } catch (error) {
            console.error("Error changing role:", error);
            toast({
                title: "Error",
                description: (error as Error).message || "Failed to change payment mode",
                variant: "destructive",
            });
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
                            {isChangingRole ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <SendIcon className="w-4 h-4 mr-2" />}
                            {currentRole === PairingRole.EMITTER ? "Sending Mode" : "Send Payment"}
                        </Button>

                        <Button
                            variant={currentRole === PairingRole.RECEIVER ? "default" : "outline"}
                            onClick={() => handleRoleChange(PairingRole.RECEIVER)}
                            disabled={isChangingRole}
                            className="flex items-center justify-center"
                        >
                            {isChangingRole ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DownloadIcon className="w-4 h-4 mr-2" />}
                            {currentRole === PairingRole.RECEIVER ? "Receiving Mode" : "Receive Payment"}
                        </Button>
                    </div>

                    {currentRole !== PairingRole.NONE && (
                        <Button
                            variant="destructive"
                            onClick={() => handleRoleChange(PairingRole.NONE)}
                            disabled={isChangingRole}
                            className="flex items-center justify-center"
                        >
                            {isChangingRole ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XIcon className="w-4 h-4 mr-2" />}
                            Reset Mode
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
