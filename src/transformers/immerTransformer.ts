import { setGlobalConfig, StateTransformer } from '../core';

const immerTransformer: StateTransformer<any> = {
    name: 'immerTransformer',
    fn: (
        _storeName,
        _actionName,
        _prevState,
        nextState,
        config,
        updater,
        ..._args: any[]
    ) => {
        return config.immer?.(nextState, (draft) => {
            updater(draft); // immer throws an error if (draft) => updater(draft) is used becuase this code modifies the draft and returs it at same time which is not allowed in immer
        });
    },
};

export const useWithImmer = (
    immer: (state: any, recipe: (draft: any) => void) => any
) => {
    setGlobalConfig({
        immer: immer,
        transformers: [immerTransformer],
    });
};
