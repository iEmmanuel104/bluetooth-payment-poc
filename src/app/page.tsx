// app/page.tsx
import { PaymentDashboard } from "@/components/payment/payment-dashboard";

export default function Home() {
    return (
        <main className="container mx-auto p-4">
            <PaymentDashboard />
        </main>
    );
}
