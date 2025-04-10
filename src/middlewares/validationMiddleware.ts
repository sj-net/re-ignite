import { getGlobalConfig, Middleware, setGlobalConfig } from '../core';

const validationMiddleware: Middleware<any> = {
    name: 'validation',
    type: 'before',
    fn: (
        _storeName: string,
        actionName: string,
        prevState,
        nextState,
        _config,
        others: any,
        ..._args: any[]
    ) => {
        others.validations?.[actionName]?.(prevState, nextState);
    },
};

export const throwValidationError = (msg: string) => {
    throw new ValidationError(`[Validation Error] ${msg}. So action ignored.`);
};

class ValidationError extends Error {
    constructor(message: string) {
        super(message); // Call the parent constructor with the message
        this.name = 'Validation Error'; // Set the error name to be the custom type name
    }
}

export const useWithValidation = () => {
    setGlobalConfig({
        beforeMiddlewares: [validationMiddleware],
    });
};
