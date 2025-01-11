// lib/db/index.ts
import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Wallet } from "@/types";
import { OfflineToken } from "../blockchain/types";

interface PaymentDB extends DBSchema {
    tokens: {
        key: string;
        value: OfflineToken;
    };
    wallet: {
        key: string;
        value: Wallet;
    };
}

export class Database {
    private db: IDBPDatabase<PaymentDB> | null = null;

    async initialize(): Promise<void> {
        this.db = await openDB<PaymentDB>("PaymentDB", 1, {
            upgrade(db) {
                db.createObjectStore("tokens", { keyPath: "id" });
                db.createObjectStore("wallet", { keyPath: "address" });
            },
        });
    }

    async getWallet(address: string): Promise<Wallet | undefined> {
        return this.db?.get("wallet", address);
    }

    async saveWallet(wallet: Wallet): Promise<void> {
        await this.db?.put("wallet", wallet);
    }

    async saveToken(token: OfflineToken): Promise<void> {
        await this.db?.put("tokens", token);
    }

    async getTokens(): Promise<OfflineToken[]> {
        return this.db?.getAll("tokens") ?? [];
    }
}