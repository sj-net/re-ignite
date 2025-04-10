import { Difference } from 'microdiff';

import {
    getGlobalConfig,
    ILoggerOptions,
    IStoreConfig,
    Middleware,
    setGlobalConfig,
} from '../core';
import diff from 'microdiff';
const loggerMiddleware: Middleware<any> = {
    name: 'logger',
    type: 'after',
    fn: (
        storeName: string,
        actionName: string,
        prevState,
        nextState,
        config,
        others,
        ...args: any[]
    ) => {
        logDiff(
            storeName,
            actionName,
            config,
            diff(prevState, nextState, { cyclesFix: false })
        );
    },
};

function logDiff<T>(
    storeName: string,
    actionName: string,
    config: IStoreConfig<T>,
    diff?: Difference[] | undefined
) {
    if (diff) {
        let logger = config.log.logger;

        diff.forEach((elem) => {
            const { type, path } = elem;

            logger.log(
                `%c ${dictionary.get(type)?.text}`,
                style(type),
                ...render(elem, storeName, actionName)
            );
        });
    }
}

const dictionary = new Map([
    ['CHANGE', { color: '#2196F3', text: 'PROPERTY CHANGED:' }],
    ['REMOVE', { color: '#F44336', text: 'PROPERTY DELETED:' }],
    ['CREATE', { color: '#FF9800', text: 'ARRAY CHANGED:' }],
]);

function style(kind: string) {
    return `color: ${dictionary.get(kind)?.color}; FONT-SIZE: 1em;`;
}

function render(diff: Difference, storeName: string, actionName: string) {
    const { type, path, value, oldValue } = diff as any;

    switch (type) {
        case 'CHANGE':
            return [
                `store: ${storeName}`,
                `action: ${actionName}`,
                path?.join('.'),
                oldValue,
                '→',
                value,
            ];
        case 'CREATE':
            return [
                `store: ${storeName}`,
                `action: ${actionName}`,
                path?.join('.'),
                value,
            ];
        case 'REMOVE':
            return [
                `store: ${storeName}`,
                `action: ${actionName}`,
                path?.join('.'),
            ];
        default:
            return [];
    }
}

export const useWithLogger = (logOptions?: ILoggerOptions) => {
    var options = {
        beforeMiddlewares: [loggerMiddleware],
    };

    if (logOptions) {
        options['log'] = logOptions;
    }

    setGlobalConfig(options);
};
