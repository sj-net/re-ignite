import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from 'react-bootstrap';
import { IAction } from '../../src/core';
import { createReactStore } from '../../src/react';

export const CounterComponent: React.FC = () => {
    const count = counterStore.hooks.useCount();
    const { increment, decrement } = counterStore.actions;
    return (
        <div className='m-2'>
            <Button
                variant='outline-info'
                size='sm'
                className='m-1'
                onClick={() => increment()}
            >
                +
            </Button>
            <span>{count}</span>
            <Button
                variant='outline-info'
                size='sm'
                className='m-1'
                onClick={() => decrement()}
            >
                -
            </Button>
            <SyntaxHighlighter
                language='tsx'
                style={oneDark}
            >
                {`
import { Button } from 'react-bootstrap';
import { IAction } from '../../src/core';
import { createReactStore } from '../../src/react';

export const CounterComponent: React.FC = () => {
    const count = counterStore.hooks.useCount();
    const { increment, decrement } = counterStore.actions;
    return (
        <div className='m-2'>
            <Button
                variant='outline-info'
                size='sm'
                className='m-1'
                onClick={() => increment()}
            >
                +
            </Button>
            <span>{count}</span>
            <Button
                variant='outline-info'
                size='sm'
                className='m-1'
                onClick={() => decrement()}
            >
                -
            </Button>
        </div>
    );
};

export interface ICounterState {
    count: number;
    isBusy: boolean;
    name?: string;
}

export interface ICounterActions extends IAction {
    increment: () => void;
    decrement: () => void;
    markBusy: () => void;
    markIdle: () => void;
    setName: (name: string) => void;
}

export const counterStore = createReactStore<
    ICounterState,
    ICounterActions,
    {}
>({
    storeName: 'counter',
    initialState: { count: 0, isBusy: false },
    actions: {
        increment: (draft) => {
            draft.count += 1;
        },
        decrement: (draft) => {
            draft.count -= 1;
        },
        markBusy: (draft) => {
            draft.isBusy = true;
        },
        markIdle: (draft) => {
            draft.isBusy = false;
        },
        setName: (draft, name) => {
            draft.name = name;
        },
    },
    selectors: {},
    validations: {
        _: (draft) => {
            if (draft.count < 0) {
                throw new Error('Count cannot be negative');
            }
        },
    },
});
`}
            </SyntaxHighlighter>
        </div>
    );
};

export interface ICounterState {
    count: number;
    isBusy: boolean;
    name?: string;
}

export interface ICounterActions extends IAction {
    increment: () => void;
    decrement: () => void;
    markBusy: () => void;
    markIdle: () => void;
    setName: (name: string) => void;
}

export const counterStore = createReactStore<
    ICounterState,
    ICounterActions,
    {}
>({
    storeName: 'counter',
    initialState: { count: 0, isBusy: false },
    actions: {
        increment: (draft) => {
            draft.count += 1;
        },
        decrement: (draft) => {
            draft.count -= 1;
        },
        markBusy: (draft) => {
            draft.isBusy = true;
        },
        markIdle: (draft) => {
            draft.isBusy = false;
        },
        setName: (draft, name) => {
            draft.name = name;
        },
    },
    selectors: {},
    validations: {
        _: (draft) => {
            if (draft.count < 0) {
                throw new Error('Count cannot be negative');
            }
        },
    },
});
