import {
    ILoggerOptions,
    IPersistEngine,
    IPersistOptions,
    IPersistStorage,
} from '../core';

export type StorageType = 'localStorage' | 'sessionStorage' | 'indexedDB';

export class DefaultPersistEngine<T> implements IPersistEngine<T> {
    storage: IPersistStorage<T>;
    writeFailHandler = (err: Error) => {
        this.logger.logger.error(
            `[PersistEngine] Failed to write state: ${err.message}`
        );
    };
    options: IPersistOptions<T>;
    onMigrationFailure = (err: Error, versionFailed: number) => {
        this.logger.logger.error(
            `[PersistEngine] Migration failed for version ${versionFailed}: ${err.message}`
        );
    };
    onMigrationSuccess = (state: T, version: number) => {};
    onPersistSuccess = (state: T) => {
        this.logger.logger.info(
            `[PersistEngine] Successfully persisted state for key "${this.options.key}"`
        );
    };
    onPersistFailure = (err: Error) => {
        this.logger.logger.error(
            `[PersistEngine] Failed to persist state: ${err.message}`
        );
    };
    onRehydrateSuccess = (state: T) => {
        this.logger.logger.info(
            `[PersistEngine] Successfully rehydrated state for key "${this.options.key}"`,
            state
        );
    };
    onRehydrateFailure = (err: Error) => {
        this.logger.logger.error(
            `[PersistEngine] Failed to rehydrate state: ${err.message}`,
            err
        );
    };
    logger: ILoggerOptions;

    constructor(
        options: IPersistOptions<T>,
        storage: IPersistStorage<T>,
        logger: ILoggerOptions
    ) {
        this.storage = storage;
        this.options = options;
        this.logger = logger;
    }

    migrate = async () => {
        let persistedState = await this.getHydratedState();
        if (persistedState) {
            if (this.storage.postReadTransform) {
                persistedState = this.storage.postReadTransform(persistedState);
            }
        }

        persistedState = JSON.parse(persistedState);

        if (!this.options.migrateVersions) return persistedState;

        const currentVersion = this.options.version;
        const storedVersion = parseInt(
            localStorage.getItem(`${this.options.key}_version`) || '0'
        );

        if (storedVersion < currentVersion) {
            try {
                for (let i = storedVersion + 1; i <= currentVersion; i++) {
                    if (this.options.migrateVersions[i] !== undefined)
                        persistedState = this.options.migrateVersions[i](
                            persistedState,
                            i
                        );
                }
                localStorage.setItem(
                    `${this.options.key}_version`,
                    currentVersion.toString()
                );
                this.persistState(persistedState);
                if (this.onMigrationSuccess)
                    this.onMigrationSuccess(persistedState, currentVersion);
            } catch (err: any) {
                if (this.onMigrationFailure)
                    this.onMigrationFailure(err, storedVersion);
                throw err;
            }
        }

        return persistedState;
    };
    getHydratedState() {
        return this.storage.getItem(this.options.key);
    }
    // Persist the state after validation and transformation
    async persistState(state: T): Promise<void> {
        try {
            const transformedState = this.storage.preWriteTransform
                ? this.storage.preWriteTransform(state)
                : state;
            await this.storage.setItem(this.options.key, transformedState);
            localStorage.setItem(
                `${this.options.key}_version`,
                this.options.version.toString()
            );
            if (this.onPersistSuccess) this.onPersistSuccess(state);
        } catch (err: any) {
            if (this.onPersistFailure) this.onPersistFailure(err);
            throw err;
        }
    }

    // Clear persisted state
    async clearPersistedState(): Promise<void> {
        try {
            await this.storage.purge();
            await this.storage.removeItem(this.options.key);
            localStorage.removeItem(`${this.options.key}_version`);
        } catch (err: any) {
            if (this.onPersistFailure) this.onPersistFailure(err);
            throw err;
        }
    }
}

export const createPersistEngine = <T>(
    key: string,
    version: number,
    storage: IPersistStorage<T>,
    logger: ILoggerOptions,
    options?: Partial<IPersistOptions<T>>
): IPersistEngine<T> => {
    return new DefaultPersistEngine<T>(
        {
            ...options,
            key,
            version,
        },
        storage,
        logger
    );
};
