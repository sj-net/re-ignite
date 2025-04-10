import { IPersistStorage } from '../../core';

export class WebStorage<T> implements IPersistStorage<T> {
    private storage: Storage;

    constructor(
        storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
    ) {
        this.storage =
            storageType === 'localStorage' ? localStorage : sessionStorage;
    }

    async getItem(key: string): Promise<T | null> {
        return new Promise((resolve) => {
            const item = this.storage.getItem(key);
            resolve(item ? JSON.parse(item) : null);
        });
    }

    async setItem(key: string, value: T): Promise<void> {
        return new Promise((resolve) => {
            this.storage.setItem(key, JSON.stringify(value));
            resolve();
        });
    }

    async removeItem(key: string): Promise<void> {
        return new Promise((resolve) => {
            this.storage.removeItem(key);
            resolve();
        });
    }

    async clear(): Promise<void> {
        return new Promise((resolve) => {
            this.storage.clear();
            resolve();
        });
    }

    async purge(): Promise<void> {
        return this.clear();
    }
}
