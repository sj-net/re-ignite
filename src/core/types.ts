//#region Misc Type
type Nullable<T> = T | null | undefined;
export type SelectorFn<T> = (...args: []) => T;
export type ActionFn<T> = (state: T, ...args: any[]) => void;
export interface IAction {
    [key: string]: ActionFn<any>;
}
export interface ISelector {
    [key: string]: (...args: any[]) => any;
}
export type WithStateFunction<TState, TActions extends IAction> = {
    [K in keyof TActions]: (
        state: TState,
        ...args: Parameters<TActions[K]>
    ) => ReturnType<TActions[K]>;
};
export type WithoutStateFunction<T extends IAction> = {
    [K in keyof T]: T[K] extends (...args: infer A) => any
        ? (...args: A) => void | Promise<void> // This returns the action without any state
        : never;
};
//#endregion
//#region Store Hooks
export type StoreHooks<TState> = {
    [K in keyof TState as `use${Capitalize<string & K>}`]-?: () =>
        | TState[K]
        | null
        | undefined;
} & {
    [K in keyof TState as TState[K] extends object
        ? TState[K] extends any[]
            ? never
            : K
        : never]-?: StoreHooks<NonNullable<TState[K]>>;
} & {
    [K in keyof TState as TState[K] extends Nullable<object>
        ? TState[K] extends any[]
            ? never
            : K
        : never]-?: StoreHooks<NonNullable<TState[K]>>;
};
//#endregion
export interface IStoreAPI<
    TState,
    TAction extends IAction,
    TSelectors extends ISelector
> {
    getState: () => TState;
    setState: (
        updateFn: ((draft: TState) => void) | Partial<TState>,
        actionName?: string,
        localConfig?: InlineStoreConfig<TState>,
        ...args: any[]
    ) => void;
    setStateAsync: (
        updater: ((draft: TState) => void) | TState | Partial<TState>,
        actionName?: string,
        localConfig?: InlineStoreConfig<TState>,
        ...args: any[]
    ) => Promise<void>;
    subscribe: (listener: (nextSnapshot: TState) => void) => () => void;
    unsubscribe: (listener: (nextSnapshot: TState) => void) => void;
    actions: WithoutStateFunction<TAction>;
    selectors: WithoutStateFunction<TSelectors>;
    persist: {
        reHydrate: () => Promise<void>;
        clear: () => Promise<void>;
    };
    destroy: () => void;
    hooks: StoreHooks<TState>;
    storeName: string;
    initialState: TState;
}
export interface IStoreConfig<T> {
    log: ILoggerOptions;
    beforeMiddlewares: Middleware<any>[];
    afterMiddlewares: Middleware<any>[];
    transformers: StateTransformer<any>[];
    persist?: IPersistEngine<T>;
    globalErrorHandler: (
        error: Error,
        name: string,
        lastGoodState: any
    ) => void;
    rollbackOnError: boolean;
    devTools: boolean;
    immer?: (state: any, recipe: (draft: any) => void) => any;
    lastSetAt: number; // allow changing global store even after creating stores.
}
// Allow only the properties defined in IStoreConfig to be passed to InlineStoreConfig
// and make them optional. This is useful for inline store configuration.
export interface InlineStoreConfig<T>
    extends Partial<
        Pick<
            IStoreConfig<T>,
            | 'rollbackOnError'
            | 'transformers'
            | 'beforeMiddlewares'
            | 'afterMiddlewares'
        >
    > {}
export interface IStoreMetadata<
    TState,
    TActions extends IAction,
    TSelectors extends ISelector
> {
    storeName: string;
    initialState: TState;
    actions: WithStateFunction<TState, TActions>;
    selectors: WithStateFunction<TState, TSelectors>;
    storeConfig?: Partial<IStoreConfig<TState>>;
    validations?: {
        [key: string]: (prevState: TState, nextState: TState) => void;
    };
}
//#region Store State
//#region transformers
export interface StateTransformer<T> {
    name: string; // Name of the transformer
    fn: (
        storeName: string,
        actionName: string,
        prevState: T,
        nextState: T,
        config: IStoreConfig<T>,
        updater: ((draft: T) => void) | Partial<T> | T,
        ...args: any[]
    ) => T;
}
//#endregion
//#region logger
export interface ILoggerOptions {
    level?: 'info' | 'warn' | 'error' | 'none';
    logger: Console;
    timestamp?: boolean;
    colorize?: boolean;
}
//#endregion
//#region PersistEngine
export interface IPersistStorage<T> {
    getItem: (key: string) => Promise<any>;
    setItem: (key: string, value: any) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    purge: () => Promise<void>;
    preWriteTransform?: (state: T) => any;
    postReadTransform?: (state: T) => any;
}
export interface IPersistEngine<T> {
    storage: IPersistStorage<T>;
    migrate: () => Promise<T>;
    writeFailHandler?: (err: Error) => void;
    options: IPersistOptions<T>;
    onMigrationFailure?: (
        err: Error,
        versionFailed: number,
        storeName: string
    ) => void;
    onMigrationSuccess?: (state: T, version: number, storeName: string) => void;
    onPersistSuccess?: (
        state: T,
        storeName: string,
        actionName: string
    ) => void;
    onPersistFailure?: (
        err: Error,
        storeName: string,
        actionName: string
    ) => void;
    onRehydrateSuccess?: (state: T, storeName: string) => void;
    onRehydrateFailure?: (err: Error, storeName: string) => void;
    getHydratedState: () => Promise<any>;
    persistState: (state: T) => Promise<void>;
    clearPersistedState: () => Promise<void>;
}
export interface IPersistOptions<T> {
    key: string;
    version: number;
    whitelist?: Array<string>;
    blacklist?: Array<string>;
    isAutoRehydrate?: boolean;
    migrateVersions?: {
        [key: number]: (storedState: T, version: number) => T;
    };
    throttle?: number;
}
// #endregion
//#region
export type MiddlewareType =
    | 'before' // Runs before an action is executed.
    | 'after' // Runs after an action is executed.
    | 'both'; // Runs before and after an action.
export interface Middleware<T> {
    name: string; // Middleware name
    type: MiddlewareType; // Defines when it runs (before/after/both or a specific function like logging)
    fn: (
        storeName: string,
        actionName: string,
        prevState: T,
        nextState: T,
        config: IStoreConfig<T>,
        others: any,
        ...args: any[]
    ) => void;
}
//#endregion
//#region Dev Tools
declare global {
    interface Window {
        __RE_IGNITE__: DevToolsBridge;
    }
}
export interface DevToolsEvent<TState = any> {
    storeName: string;
    actionName: string;
    timestamp: number;
}
export interface SaveActionEvent<TState = any> extends DevToolsEvent<TState> {
    prevState: TState;
    nextState: TState;
    args: any[];
    timeTaken: number;
}
export interface ApplySnapshotEvent<TState = any>
    extends DevToolsEvent<TState> {
    snapshot: TState;
}
export interface DevToolsBridge {
    saveAction: <TState = any>(event: SaveActionEvent<TState>) => void;
    applySnapshot: <TState = any>(event: ApplySnapshotEvent<TState>) => void;
    onStoreCreated: (
        storeName: string,
        store: IStoreAPI<any, any, any>
    ) => void;
    stores: {
        [storeName: string]: IStoreAPI<any, any, any>;
    };
}
//#endregion
