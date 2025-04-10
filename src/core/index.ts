//#region Plain Core

import {
    IAction,
    InlineStoreConfig,
    ISelector,
    IStoreAPI,
    IStoreConfig,
    IStoreMetadata,
    StoreHooks,
    WithoutStateFunction,
    WithStateFunction,
} from './types';

export * from './types';
import merge from 'just-merge';
// import clone from 'just-clone';
const GLOBAL_KEY = '__RE_IGNITE_CONFIG__';

type GlobalConfigWrapper = {
    config: IStoreConfig<any>;
    reset: () => void;
};

const defaultGlobalConfig: IStoreConfig<any> = {
    log: {
        level: 'info',
        logger: console,
        timestamp: true,
        colorize: true,
    },
    globalErrorHandler: (error, name, lastGoodState) => {
        getGlobalConfig().log.logger.error(` [${name}]: ${error.message}`);
    },
    afterMiddlewares: [],
    beforeMiddlewares: [],
    transformers: [],
    rollbackOnError: true,
    devTools: false,
    lastSetAt: new Date().getTime(),
};

function ensureGlobalConfig(): GlobalConfigWrapper {
    const win = typeof window !== 'undefined' ? window : (globalThis as any);
    if (!win[GLOBAL_KEY]) {
        win[GLOBAL_KEY] = {
            config: { ...defaultGlobalConfig },
            reset: () => {
                win[GLOBAL_KEY].config = { ...defaultGlobalConfig };
                win[GLOBAL_KEY].config.lastSetAt = new Date().getTime(); // update lastSetAt to current time.
            },
        };
    }
    return win[GLOBAL_KEY];
}

export const getGlobalConfig = (): IStoreConfig<any> => {
    return ensureGlobalConfig().config;
};

export const setGlobalConfig = (config: Partial<IStoreConfig<any>>) => {
    const g = ensureGlobalConfig();
    g.config = updateKnownProps(g.config, config, true);
    g.config.lastSetAt = new Date().getTime(); // update lastSetAt to current time.
};

export const resetGlobalConfig = () => {
    ensureGlobalConfig().reset();
};

function updateKnownProps<TState>(
    a: IStoreConfig<TState>,
    b?: Partial<IStoreConfig<TState>>,
    mergeArrays: boolean = false
): IStoreConfig<TState> {
    const result = { ...a };
    if (b) {
        // Merge only known properties from b into result.
        for (const key in b) {
            // if key in a is array and mergeArrays is true, then merge arrays from a and b.
            if (Array.isArray(a[key]) && mergeArrays) {
                result[key] = [...(a[key] as any), ...(b[key] as any)];
                continue;
            }

            // if value is not passed in b, then use value from a.
            else result[key] = b[key];
        }
    }

    return result;
}

export const allStores: { [key in string]: IStoreAPI<any, any, any> } = {};

export function createStore<
    TState extends object,
    TActions extends IAction,
    TSelectors extends ISelector
>(
    metadata: IStoreMetadata<TState, TActions, TSelectors>
): IStoreAPI<TState, TActions, TSelectors> {
    const { storeName, actions, selectors } = metadata;

    const storeConfig = { ...metadata.storeConfig };
    let _lastMergedConfig = updateKnownProps(
        getGlobalConfig(),
        storeConfig,
        true
    );
    const mergedConfig = () => {
        const latestGlobalConfig = getGlobalConfig();
        if (latestGlobalConfig.lastSetAt !== _lastMergedConfig.lastSetAt) {
            // update global config if lastSetAt is different.
            // this allows to update global config even after creating stores.
            _lastMergedConfig = updateKnownProps(
                latestGlobalConfig,
                storeConfig,
                true
            );
        }

        return _lastMergedConfig;
    };

    const validations = metadata.validations || {};
    let state = structuredClone(metadata.initialState) as TState; // use initial state from tests.

    const setState = (
        updater: ((draft: TState) => void) | Partial<TState>,
        actionName: string = '_',
        inlineConfig?: InlineStoreConfig<TState>,
        ...middlewareArgs: any[]
    ) => {
        const start = performance.now();
        let localMergedConfig = updateKnownProps(mergedConfig(), inlineConfig);
        const prevState = structuredClone(state);
        let nextState = structuredClone(state);

        try {
            // Step 1: Run Transformers if any or get next state from updater.
            if (typeof updater === 'function') {
                if (localMergedConfig.transformers.length > 0) {
                    for (const transformer of localMergedConfig.transformers) {
                        nextState = transformer.fn(
                            storeName,
                            actionName,
                            prevState,
                            nextState,
                            localMergedConfig,
                            updater
                        );
                    }
                } else {
                    throw new Error(
                        'Updater function is not allowed when transformers are NOT used.'
                    );
                }
            } else {
                nextState = merge(nextState, updater);
            }

            const clonedNextState = structuredClone(nextState); // avoid updating state from inside middleware.

            // Step 3: Run Middleware Before Update
            for (const middleware of localMergedConfig.beforeMiddlewares) {
                middleware.fn(
                    storeName,
                    actionName,
                    prevState,
                    clonedNextState, // avoid updating state from inside middleware.
                    localMergedConfig,
                    {
                        validations,
                    },
                    ...middlewareArgs
                );
            }

            // Step 4: Commit State Update
            state = nextState;
            const end = performance.now();

            // Step 5: Run Middleware After Update
            for (const middleware of localMergedConfig.afterMiddlewares) {
                middleware.fn(
                    storeName,
                    actionName,
                    prevState,
                    clonedNextState, // avoid updating state from inside middleware.
                    localMergedConfig,
                    {
                        validations,
                        timeTaken: end - start, // time taken for the action
                    },
                    ...middlewareArgs
                );
            }

            // Step 6: Notify Subscribers
            notify();
        } catch (error: any) {
            if (localMergedConfig.rollbackOnError) {
                state = prevState;
                notify();
            }
            mergedConfig().globalErrorHandler(error, storeName, state);

            throw error; // Re-throw the error after handling it.
        }
    };

    const setStateAsync = async (
        updater: ((draft: TState) => void) | Partial<TState>,
        actionName?: string,
        inlineConfig?: InlineStoreConfig<TState>,
        ...middlewareArgs: any[]
    ): Promise<void> => {
        try {
            setState(updater, actionName, inlineConfig, ...middlewareArgs);
        } catch (error) {
            return Promise.reject(error);
        }
    };

    const listeners: Set<(newState: TState) => void> = new Set();

    const notify = () => {
        const snapshot = state;
        listeners.forEach((listener) => listener(snapshot)); // ensure everyone get's same state.
    };

    const subscribe = (listener: (newState: TState) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    const unsubscribe = (listener: (newState: TState) => void) => {
        listeners.delete(listener);
    };

    const getState = (): TState => state; // return a copy of state so that state is not returned while setState is in progress.

    const reHydrate = async () => {
        let persistEngine = mergedConfig().persist;
        if (!persistEngine) {
            return;
        }

        let persistedState = await persistEngine.migrate();

        try {
            if (persistedState) {
                state = merge(state, persistedState);
                persistEngine.onRehydrateSuccess?.(state, storeName);
            }
        } catch (error: any) {
            persistEngine.onRehydrateFailure?.(error, storeName);
        }
    };

    const persistAPI = {
        reHydrate,
        clear: async () => mergedConfig().persist?.clearPersistedState(),
    };

    // use proxy only when devTools is not enabled. when devTools is enabled, we need to use plain object to help developer to find the actions/selectors/hooks easily.
    let useProxy = !mergedConfig().devTools;
    var store: IStoreAPI<TState, TActions, TSelectors> = {
        getState,
        setState,
        actions: createActions(actions, setState, setStateAsync, useProxy),
        selectors: createSelectors(selectors, getState, useProxy),
        subscribe,
        unsubscribe,
        setStateAsync,
        persist: persistAPI,
        destroy: () => {
            listeners.clear();
            persistAPI.clear();
        },
        hooks: createHooks<TState>(getState, useProxy),
        storeName,
        initialState: metadata.initialState,
    };

    if (!mergedConfig().devTools && allStores[storeName]) {
        mergedConfig().log.logger.warn(
            `%c [${storeName}]: Store already exists. Overwriting...`,
            'color: #FF9800; FONT-SIZE: 1em;'
        );
    }
    allStores[storeName] = store;

    if (mergedConfig().devTools) {
        window.__RE_IGNITE__?.onStoreCreated(storeName, store as any);
        mergedConfig().log.logger.info(
            `%c [${storeName}]: Store created.`,
            'color: #4CAF50; FONT-SIZE: 1em;'
        );
    }

    return store;
}

// ✅ Optimized Action Execution (No Redundant Wrapping)
function createActions<TState, TActions extends IAction>(
    actions: WithStateFunction<TState, TActions>,
    setState: (updater: (draft: TState) => void, actionName: string) => void,
    setStateAsync: (
        updater: (draft: TState) => void,
        actionName: string
    ) => Promise<void>,
    useProxy: boolean
): WithoutStateFunction<TActions> {
    const buildPlain = (): WithoutStateFunction<TActions> => {
        const result: Record<string, any> = {};
        for (const key in actions) {
            const action = actions[key];
            if (!action) continue;

            result[key] = isAsyncFunction(action)
                ? async (...args: Parameters<TActions[keyof TActions]>) => {
                      await setStateAsync(
                          (state) => action(state, ...args),
                          key
                      );
                  }
                : (...args: Parameters<TActions[keyof TActions]>) => {
                      setState((state) => action(state, ...args), key);
                  };
        }
        return result as WithoutStateFunction<TActions>;
    };

    if (!useProxy) return buildPlain();

    return new Proxy({} as WithoutStateFunction<TActions>, {
        get(_, key: string) {
            const action = actions[key as keyof TActions];
            if (!action) return undefined;

            return isAsyncFunction(action)
                ? async (...args: Parameters<TActions[keyof TActions]>) => {
                      await setStateAsync(
                          (state) => action(state, ...args),
                          key
                      );
                  }
                : (...args: Parameters<TActions[keyof TActions]>) => {
                      setState((state) => action(state, ...args), key);
                  };
        },
    });
}

function createSelectors<TState, TSelectors extends ISelector>(
    selectors: WithStateFunction<TState, TSelectors>,
    getState: () => TState,
    useProxy: boolean
): WithoutStateFunction<TSelectors> {
    const buildPlain = (): WithoutStateFunction<TSelectors> => {
        const result: Record<string, any> = {};
        for (const key in selectors) {
            const selector = selectors[key];
            if (!selector) continue;

            result[key] = (...args: Parameters<TSelectors[keyof TSelectors]>) =>
                selector(getState(), ...args);
        }
        return result as WithoutStateFunction<TSelectors>;
    };

    if (!useProxy) return buildPlain();

    return new Proxy({} as WithoutStateFunction<TSelectors>, {
        get(_, key: string) {
            const selector = selectors[key as keyof TSelectors];
            if (!selector) return undefined;

            return (...args: Parameters<TSelectors[keyof TSelectors]>) =>
                selector(getState(), ...args);
        },
    });
}

function createHooks<TState>(
    getState: () => TState,
    useProxy?: boolean
): StoreHooks<TState> {
    function buildPlain(): any {
        const hooks = {} as StoreHooks<TState>;

        function generateHooks(
            obj: any,
            path: string[] = [],
            parent: any = hooks
        ) {
            for (const key in obj) {
                const hookKey = `use${
                    key.charAt(0).toUpperCase() + key.slice(1)
                }`;

                // Hook to return the full object or primitive value
                parent[hookKey] = () => safeGet(getState(), path.concat(key));

                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    parent[key] = {}; // Create nested object
                    generateHooks(obj[key], [...path, key], parent[key]); // Recurse for nested props
                }
            }
        }

        return generateHooks(getState());
    }

    if (!useProxy) return buildPlain();

    function createProxy(path: string[] = []): any {
        return new Proxy(() => getState(), {
            get(target, prop: string) {
                if (typeof prop !== 'string') return undefined;

                // If it's a hook request (e.g., "useTheme")
                if (prop.startsWith('use')) {
                    const key = prop.slice(3, 4).toLowerCase() + prop.slice(4); // "useTheme" -> "theme"
                    return () => safeGet(target(), [...path, key]);
                }

                // If it's a nested object, return another Proxy for deeper access
                const nextValue = safeGet(target(), [...path, prop]);
                if (
                    typeof nextValue === 'object' &&
                    nextValue !== null &&
                    !Array.isArray(nextValue)
                ) {
                    return createProxy([...path, prop]);
                }

                return undefined; // Avoid exposing non-object properties
            },
        });
    }

    return createProxy();
}

export const isAsyncFunction = (fn: Function) =>
    Object.prototype.toString.call(fn) === '[object AsyncFunction]';

export function safeGet<T>(obj: any, path: string[]): T | null {
    return path.reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : null),
        obj
    );
}
