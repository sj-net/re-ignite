import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import {
    getGlobalConfig,
    IStoreAPI,
    IPersistEngine,
    createStore,
    allStores,
    resetGlobalConfig,
} from '../src/core';

import {
    ICounterState,
    ICounterActions,
    ICounterSelectors,
    initialState,
} from './setup';
import { beforeEach } from 'node:test';
import {} from '../src/devtools';
import { useWithImmer } from '../src/transformers/immerTransformer';
import {
    createPersistEngine,
    DefaultPersistEngine,
    persistMiddleware,
    WebStorage,
} from '../src/persist';
import { useWithLogger, useWithValidation } from '../src/middlewares';

const createCounterStore = (
    persistEngine?: IPersistEngine<ICounterState>
): IStoreAPI<ICounterState, ICounterActions, ICounterSelectors> => {
    delete allStores.counter; // Clear the store before each test
    resetGlobalConfig();
    useWithImmer(produce);
    useWithValidation();
    useWithLogger();
    if (!persistEngine)
        persistEngine = createPersistEngine<ICounterState>(
            'counter',
            1,
            new WebStorage(),
            getGlobalConfig().log,
            {
                isAutoRehydrate: true,
            }
        );

    return createStore<ICounterState, ICounterActions, ICounterSelectors>({
        storeName: 'counter',
        initialState,
        actions: {
            increment: (state: ICounterState) => {
                state.count++;
            },
            decrement: (state: ICounterState) => {
                state.count--;
            },
            add: (state: ICounterState, by: number) => {
                state.count = state.count + by;
            },
            resetAsync: async (state: ICounterState) => {
                state.count = 0;
            },
        },
        selectors: {
            isEven: (state: ICounterState) => state.count % 2 === 0,
            isOdd: (state: ICounterState) => state.count % 2 !== 0,
            getCount: (state: ICounterState) => state.count,
            isDivisibleBy: (state: ICounterState, divisor: number) =>
                state.count % divisor === 0,
            getNames: (state: ICounterState) => state.names,
        },
        validations: {},
        storeConfig: {
            rollbackOnError: true,
            persist: persistEngine,
            afterMiddlewares: [persistMiddleware],
        },
    });
};

const sessionStorageEngine = () =>
    createPersistEngine<ICounterState>(
        'counter',
        1,
        new WebStorage('sessionStorage'),
        getGlobalConfig().log,
        {
            isAutoRehydrate: true,
        }
    );

describe('Persist State Management', () => {
    let store: IStoreAPI<ICounterState, ICounterActions, ICounterSelectors>;

    beforeEach(() => {
        delete allStores.counter; // Clear the store before each test
    });
    it('LocalStorage: should persist state upon store recreation.', async () => {
        store = createCounterStore();
        store.actions.increment();
        store = createCounterStore();
        await store.persist.reHydrate();
        expect(store.selectors.getCount()).toEqual(1);
    });

    it('LocalStorage: should clear persisted storage', async () => {
        store = createCounterStore();
        store.actions.increment();
        store = createCounterStore();
        await store.persist.reHydrate();
        expect(store.selectors.getCount()).toEqual(1);
        await store.persist.clear();
        store = createCounterStore();
        expect(store.selectors.getCount()).toEqual(0);
    });

    it('SessionStorage: should persist state upon store recreation.', async () => {
        store = createCounterStore(sessionStorageEngine());
        store.actions.increment();
        store = createCounterStore(sessionStorageEngine());
        await store.persist.reHydrate();
        expect(store.selectors.getCount()).toEqual(1);
    });

    it('SessionStorage: should clear persisted storage', async () => {
        store = createCounterStore(sessionStorageEngine());
        store.actions.increment();
        store = createCounterStore(sessionStorageEngine());
        await store.persist.reHydrate();
        expect(store.selectors.getCount()).toEqual(1);
        await store.persist.clear();
        store = createCounterStore(sessionStorageEngine());
        expect(store.selectors.getCount()).toEqual(0);
    });

    it('Migrate from old version to new version', async () => {
        store = createCounterStore(
            new DefaultPersistEngine<ICounterState>(
                {
                    key: 'migrate',
                    version: 1,
                },
                new WebStorage(),
                getGlobalConfig().log
            )
        );
        store.actions.increment();

        store = createCounterStore(
            new DefaultPersistEngine<ICounterState>(
                {
                    key: 'migrate',
                    version: 2,
                    migrateVersions: {
                        2: (storedState, version) => {
                            storedState.migrated = true;
                            storedState.migratedVersion = version;
                            return storedState;
                        },
                    },
                },
                new WebStorage(),
                getGlobalConfig().log
            )
        );
        await store.persist.reHydrate();
        expect(store.getState().migrated).toBe(true);
        expect(store.getState().migratedVersion).toBe(2);
    });
});
