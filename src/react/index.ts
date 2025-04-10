import {
    IAction,
    ISelector,
    IStoreAPI,
    IStoreMetadata,
    createStore as coreCreateStore,
    allStores,
    StoreHooks,
    safeGet,
} from './../core';
import { useEffect, useRef, useState } from 'react';

export function useReRenderStore<T>(
    subscribe: (onChange: (state: T) => void) => () => void,
    getSnapshot: () => T,
    hookPath: string[]
): T | undefined | null {
    const [snapshot, setSnapshot] = useState(safeGet(getSnapshot(), hookPath));
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        const unsubscribe = subscribe((newSnapshot) => {
            if (!isMounted.current) return;
            setSnapshot(safeGet(newSnapshot, hookPath));
        });

        return () => {
            isMounted.current = false;
            unsubscribe();
        };
    }, [subscribe, getSnapshot]);

    return snapshot;
}

export function createReactStore<
    TState extends object,
    TActions extends IAction,
    TSelectors extends ISelector
>(
    metadata: IStoreMetadata<TState, TActions, TSelectors>
): IStoreAPI<TState, TActions, TSelectors> {
    var api = coreCreateStore(metadata);
    var store = {
        ...api,
        hooks: createHooks<TState>(() => api.getState(), api.subscribe),
    };
    return store;
}

// Final createHooks implementation
function createHooks<TState>(
    getState: () => TState,
    subscribe: (listener: (nextSnapshot: TState) => void) => () => void
): StoreHooks<TState> {
    const builder = new HookBuilder(getState, subscribe);
    return builder.getProxy();
}

class HookBuilder<TState> {
    private getState: () => TState;
    private subscribe: (fn: (nextSnapshot: TState) => void) => () => void;
    private proxyCache = new Map<string, any>();
    private hookKeyCache = new Map<string, string>();

    constructor(
        getState: () => TState,
        subscribe: (fn: (nextSnapshot: TState) => void) => () => void
    ) {
        this.getState = getState;
        this.subscribe = subscribe;
    }

    private getHookKey(prop: string): string {
        if (!this.hookKeyCache.has(prop)) {
            const key = prop.slice(3, 4).toLowerCase() + prop.slice(4);
            this.hookKeyCache.set(prop, key);
        }
        return this.hookKeyCache.get(prop)!;
    }

    public getProxy(path: string[] = []): any {
        const cacheKey = path.join('.');
        if (this.proxyCache.has(cacheKey)) return this.proxyCache.get(cacheKey);

        const proxy = new Proxy(
            {},
            {
                get: (_, prop: string) => {
                    if (typeof prop !== 'string') return undefined;

                    if (prop.startsWith('use')) {
                        const stateKey = this.getHookKey(prop);
                        const hookPath = [...path, stateKey];

                        const hook = () =>
                            useReRenderStore(
                                this.subscribe,
                                () => this.getState(),
                                hookPath
                            );

                        Object.defineProperty(hook, 'name', {
                            value: `use${hookPath
                                .map((p) => p[0].toUpperCase() + p.slice(1))
                                .join('')}`,
                        });

                        return hook;
                    }

                    const nextValue = safeGet(this.getState(), [...path, prop]);
                    if (
                        typeof nextValue === 'object' &&
                        nextValue !== null &&
                        !Array.isArray(nextValue)
                    ) {
                        return this.getProxy([...path, prop]);
                    }

                    return undefined;
                },
            }
        );

        this.proxyCache.set(cacheKey, proxy);
        return proxy;
    }
}
