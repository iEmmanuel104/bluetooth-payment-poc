// lib/db/index.ts
import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Token, Wallet } from "@/types";

interface PaymentDB extends DBSchema {
    tokens: {
        key: string;
        value: Token;
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

    async saveToken(token: Token): Promise<void> {
        await this.db?.put("tokens", token);
    }

    async getTokens(): Promise<Token[]> {
        return this.db?.getAll("tokens") ?? [];
    }
}