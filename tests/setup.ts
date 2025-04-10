import { IAction, ISelector } from '../src/core';

interface IProfile {
    name: string;
    age?: number;
    status?: string;
}

export interface ICounterState {
    count: number;
    names: string[];
    profile?: IProfile;

    migrated?: boolean;
    migratedVersion?: number;
}

export interface ICounterActions extends IAction {
    increment: () => void;
    decrement: () => void;
    add: (by: number) => void;
    resetAsync: () => Promise<void>;
}

export interface ICounterSelectors extends ISelector {
    isEven: () => boolean;
    isOdd: () => boolean;
    getCount: () => number;
    isDivisibleBy: (divisor: number) => boolean;
    getNames: () => string[];
}

export const validationErrorMaxValue = 10;
export const initialState: ICounterState = {
    count: 0,
    names: [],
    profile: {
        age: 0,
        name: '',
    },
};
