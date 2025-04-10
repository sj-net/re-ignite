import { IPersistEngine, Middleware, setGlobalConfig } from '../core';

export const persistMiddleware: Middleware<any> = {
    name: 'persistMiddleware',
    type: 'after', // or any other type that you define for this middleware type
    fn: async (storeName, actionName, _prevState, nextState, config, diff) => {
        if (diff && config.persist) {
            // Implement persistence logic (for example, save to localStorage or IndexedDB)
            config.persist
                .persistState(JSON.stringify(nextState))
                .then(() => {
                    config.persist?.onPersistSuccess?.(
                        nextState,
                        storeName,
                        actionName
                    );
                })
                .catch((error) => {
                    config.persist?.onPersistFailure?.(
                        error,
                        storeName,
                        actionName
                    );
                    throw error;
                });
        }
    },
};

export const useWithPersist = <T>(persistEngine: IPersistEngine<T>) => {
    setGlobalConfig({
        afterMiddlewares: [persistMiddleware],
        persist: persistEngine,
    });
};
