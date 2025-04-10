import { describe, expect, beforeEach, vi, it } from 'vitest';
import {
    createStore,
    setGlobalConfig,
    allStores,
    resetGlobalConfig,
} from '../src/core';

import {
    ICounterState,
    ICounterActions,
    ICounterSelectors,
    validationErrorMaxValue,
} from './setup';
import { produce } from 'immer';
import {
    throwValidationError,
    useWithLogger,
    useWithValidation,
} from '../src/middlewares';
import { useWithImmer } from '../src/transformers';

const initialState: ICounterState = {
    count: 0,
    names: [],
    profile: {
        age: 0,
        name: '',
    },
};

describe('ReRender State Management', () => {
    let store: ReturnType<
        typeof createStore<ICounterState, ICounterActions, ICounterSelectors>
    >;

    beforeEach(() => {
        vi.restoreAllMocks();
        delete allStores.counter; // Clear the store before each test
        resetGlobalConfig();
        useWithImmer(produce);
        useWithValidation();
        // useWithLogger();
        store = createStore<ICounterState, ICounterActions, ICounterSelectors>({
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
            validations: {
                increment: (_prevState, nextState) => {
                    if (nextState.count >= validationErrorMaxValue) {
                        throwValidationError(
                            `Count cannot become greater than ${validationErrorMaxValue}.`
                        );
                    }
                },

                decrement: (_prevState, nextState) => {
                    if (nextState.count < 0) {
                        throwValidationError('Count cannot become negative!');
                    }
                },
                _: (_prevState, nextState) => {
                    // global validation for all actions in this store.
                    if (nextState.count < 0) {
                        throwValidationError('Count cannot become negative!');
                    }
                },
            },
            storeConfig: {
                rollbackOnError: true,
            },
        });
    });

    it('should initialize with the correct state', () => {
        expect(store.getState()).toEqual(initialState);
    });

    it('should update state via actions', () => {
        store.actions.increment();
        expect(store.getState().count).toBe(1);

        store.actions.decrement();
        expect(store.getState().count).toBe(0);
    });

    it('should support passing arguments to actions', () => {
        let by = 15;
        store.actions.add(by);
        expect(store.getState().count).toBe(by);
    });

    it('should correctly use selectors', () => {
        let by = 15;
        store.actions.add(by);
        expect(store.selectors.getCount()).toBe(by);
    });

    it('should handle subscriptions', () => {
        const callback = vi.fn();
        const unsubscribe = store.subscribe(callback);

        store.actions.increment();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith({
            count: 1,
            names: [],
            profile: {
                age: 0,
                name: '',
            },
        });

        unsubscribe();
        store.actions.increment();
        expect(callback).toHaveBeenCalledTimes(1); // No further calls
    });

    it('should rollback on errors', () => {
        setGlobalConfig({ rollbackOnError: true });
        const faultyAction = () =>
            store.setState(() => {
                throw new Error('Test Error');
            }, 'FaultyAction');

        expect(() => faultyAction()).toThrow('Test Error');
        expect(store.getState()).toEqual(initialState);
    });

    it('should throw validation error upon on errors', () => {
        setGlobalConfig({ rollbackOnError: true });
        const faultyAction = () => {
            for (let i = 0; i < validationErrorMaxValue + 1; i++) {
                store.actions.increment();
            }
        };
        expect(() => faultyAction()).toThrow(
            `Count cannot become greater than ${validationErrorMaxValue}.`
        );
        expect(store.selectors.getCount()).toBe(validationErrorMaxValue - 1);
    });

    it('should run global validation when exists', () => {
        setGlobalConfig({ rollbackOnError: true });
        const faultyAction = () => {
            store.setState((state) => {
                state.count = -1;
            });
        };
        expect(() => faultyAction()).toThrow('Count cannot become negative!');
        expect(store.selectors.getCount()).toBe(0);
    });

    it('should set state when a object is passed instead of function', () => {
        setGlobalConfig({ rollbackOnError: true });
        store.setState({
            count: 10,
        });
        expect(store.selectors.getCount()).toBe(10);
    });

    it('should return when there is no change in new state', () => {
        setGlobalConfig({ rollbackOnError: true });
        store.setState({});
        expect(store.selectors.getCount()).toBe(0);
    });

    it('should handle subscriptions explicitly', () => {
        const callback = vi.fn();
        store.subscribe(callback);

        store.actions.increment();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith({
            count: 1,
            names: [],
            profile: {
                age: 0,
                name: '',
            },
        });

        store.unsubscribe(callback);
        store.actions.increment();
        expect(callback).toHaveBeenCalledTimes(1); // No further calls
    });

    it('should set state asynchronously', async () => {
        await store.setStateAsync((state) => {
            state.count = 5;
        });
        expect(store.selectors.getCount()).toBe(5);
    });

    it('should catch validation error when used async for set state', async () => {
        await expect(
            store.setStateAsync((state) => {
                state.count = -1;
            })
        ).rejects.toThrow(
            `[Validation Error] Count cannot become negative!. So action ignored.`
        );
    });

    it('should set action asynchronously', async () => {
        store.actions.increment();
        await store.actions.resetAsync();
        expect(store.selectors.getCount()).toBe(0);
    });

    it('should handle array operations', async () => {
        store.setState((state) => {
            state.count = 5;
            state.names = ['John', 'Doe'];
        });
        expect(store.selectors.getNames()).toEqual(['John', 'Doe']);
        store.setState((state) => {
            state.names = ['John'];
        });
        expect(store.selectors.getNames()).toEqual(['John']);

        store.setState((state) => {
            state.names = ['Foo'];
        });
        expect(store.selectors.getNames()).toEqual(['Foo']);
    });

    it('should handle object operations', async () => {
        store.setState((state) => {
            state.profile = {
                name: 'John',
                age: 30,
            };
        });
        expect(store.getState().profile).toEqual({
            name: 'John',
            age: 30,
        });

        store.setState((state) => {
            state.profile = {
                name: 'John',
                status: 'active',
            };
        });
        expect(store.getState().profile).toEqual({
            name: 'John',
            status: 'active',
        });
    });

    it('should invoke hooks properly', () => {
        expect(store.hooks.useCount()).toBe(0);
        expect(store.hooks.useNames()).toEqual([]);

        store.setState((state) => {
            state.count = 10;
            state.names = ['John', 'Doe'];
        });

        expect(store.hooks.useCount()).toBe(10);
        expect(store.hooks.useNames()).toEqual(['John', 'Doe']);

        store.setState((state) => {
            state.profile = {
                name: 'John',
                age: 30,
            };
        });

        expect(store.hooks.useProfile()).toEqual({
            name: 'John',
            age: 30,
        });

        let name = store.hooks.profile.useName();
        let age = store.hooks.profile.useAge();

        expect(name).toBe('John');
        expect(age).toBe(30);
    });

    it('should not change state when persist is not configure but rehydrated', () => {
        store.persist.reHydrate();
        expect(store.getState()).toEqual(initialState);
    });
});
