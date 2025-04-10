import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';

import {
    IStoreAPI,
    IAction,
    ISelector,
    allStores,
    resetGlobalConfig,
} from '../src/core';

import '@testing-library/jest-dom';
import { useEffect } from 'react';
import { produce } from 'immer';
import React from 'react';
import { createReactStore } from '../src/react';
import { useWithLogger, useWithValidation } from '../src/middlewares';
import { useWithImmer } from '../src/transformers';

interface IProfile {
    name: string;
    age: number;
    status?: string;
}

export interface ICounterState {
    profile: IProfile;
    count: number;
}

export interface ICounterActions extends IAction {
    increment: () => void;
}

let initialState: ICounterState = {
    profile: {
        name: 'John Doe',
        age: 0,
        status: 'active',
    },
    count: 0,
};

export interface ICounterSelectors extends ISelector {}

describe('createHooks', () => {
    let store: IStoreAPI<ICounterState, ICounterActions, ICounterSelectors>;

    beforeEach(() => {
        delete allStores.counter; // Clear the store before each test
        resetGlobalConfig();
        useWithImmer(produce);
        useWithValidation();
        // useWithLogger();
        store = createReactStore<
            ICounterState,
            ICounterActions,
            ICounterSelectors
        >({
            storeName: 'counter',
            initialState,
            actions: {
                increment: (state) => state.count++,
            },
            selectors: {},
            validations: {},
            storeConfig: {
                rollbackOnError: true,
            },
        }) as IStoreAPI<ICounterState, ICounterActions, ICounterSelectors>;
    });
    it('should return correct state value', () => {
        const { result } = renderHook(() => store.hooks.useCount());
        expect(result.current).toBe(0);
    });

    it('should re-render on state change', () => {
        const { result, rerender } = renderHook(() => store.hooks.useCount());
        expect(result.current).toBe(0);
        act(() => {
            store.setState((state) => {
                state.count = 5;
            });
        });

        rerender();

        expect(result.current).toBe(5);
    });

    it('should re-render on state changed via object in setState', () => {
        const { result, rerender } = renderHook(() => store.hooks.useCount());
        expect(result.current).toBe(0);
        act(() => {
            store.actions.increment();
        });

        rerender();

        expect(result.current).toBe(1);
        act(() => {
            store.setState({
                count: 10,
            });
        });

        rerender();

        expect(result.current).toBe(10);
    });

    it('should support nested state selectors', () => {
        const { result } = renderHook(() => store.hooks.profile.useAge());
        expect(result.current).toBe(0);

        act(() => {
            store.setState((state) => {
                state.profile = {
                    age: 25,
                    name: 'John Doe',
                    status: 'active',
                };
            });
        });

        expect(result.current).toBe(25);
    });

    it('should not re-render if the subscribed value does not change', () => {
        let renderCount = 0;

        const TestComponent = () => {
            const count = store.hooks.useCount();
            useEffect(() => {
                renderCount++;
            }, [count]);
            return null;
        };

        render(<TestComponent />);

        expect(renderCount).toBe(1);

        // Update unrelated state
        act(() => {
            store.setState((s) => {
                s.profile.name = 'new name';
            });
        });

        expect(renderCount).toBe(1); // Should not re-render
    });

    it('should only re-render the component using updated state slice', () => {
        let countRender = 0;
        let profileRender = 0;

        const CountComponent = () => {
            const count = store.hooks.useCount();
            useEffect(() => {
                countRender++;
            }, [count]);
            return null;
        };

        const ProfileComponent = () => {
            const name = store.hooks.profile.useName();
            useEffect(() => {
                profileRender++;
            }, [name]);
            return null;
        };

        render(
            <>
                <CountComponent />
                <ProfileComponent />
            </>
        );

        expect(countRender).toBe(1);
        expect(profileRender).toBe(1);

        // Update only counter
        act(() => {
            store.setState((s) => {
                s.count += 1;
            });
        });

        expect(countRender).toBe(2); // CountComponent re-rendered
        expect(profileRender).toBe(1); // ProfileComponent did not
    });

    it('should not re-render nested hooks when sibling properties change', () => {
        let ageRender = 0;
        let nameRender = 0;

        const AgeComponent = () => {
            const age = store.hooks.profile.useAge();
            useEffect(() => {
                ageRender++;
            }, [age]);
            return null;
        };

        const NameComponent = () => {
            const name = store.hooks.profile.useName();
            useEffect(() => {
                nameRender++;
            }, [name]);
            return null;
        };

        render(
            <>
                <AgeComponent />
                <NameComponent />
            </>
        );

        expect(ageRender).toBe(1);
        expect(nameRender).toBe(1);

        // Only update name
        act(() => {
            store.setState((s) => {
                s.profile.name = 'New Name';
            });
        });

        expect(nameRender).toBe(2);
        expect(ageRender).toBe(1); // ✅ no re-render for age
    });

    it('should not re-render if the same value is set', () => {
        let renderCount = 0;

        const CountComponent = () => {
            const count = store.hooks.useCount();
            useEffect(() => {
                renderCount++;
            }, [count]);
            return null;
        };

        render(<CountComponent />);
        expect(renderCount).toBe(1);

        act(() => {
            store.setState((s) => {
                s.count = 0; // Already 0
            });
        });

        expect(renderCount).toBe(1); // ✅ still 1
    });
});
