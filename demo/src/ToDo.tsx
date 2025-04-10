import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';
import { IAction } from '../../src/core';
import { createReactStore } from '../../src/react';
import { Button } from 'react-bootstrap';

export const TodoComponent: React.FC = () => {
    const [task, setTask] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const tasks = todoStore.hooks.useTasks();
    const isBusy = todoStore.hooks.useIsBusy();
    const { addTask, editTask, removeTask } = todoStore.actions;

    const editTaskHandler = (index: number, task: string) => {
        setTask(task);
        setEditingIndex(index);
    };

    const addOrEditTask = () => {
        if (task.trim() === '') {
            return;
        }

        if (editingIndex !== null) {
            editTask(editingIndex, task);
            setEditingIndex(null);
        } else {
            addTask(task);
        }
        setTask('');
    };

    return (
        <div className='m-2'>
            <div className='col-3 form-inline'>
                <input
                    className='form-control mb-2 '
                    value={task}
                    placeholder='Enter a task'
                    onChange={(e) => setTask(e.target.value.trim())}
                />
                <Button
                    variant='outline-success'
                    size='sm'
                    onClick={() => addOrEditTask()}
                >
                    Save / Update
                </Button>
            </div>
            <ul className='m-3'>
                {tasks &&
                    tasks.map((t, i) => (
                        <li
                            key={i}
                            className='m-2'
                        >
                            {t}{' '}
                            <Button
                                variant='outline-danger'
                                size='sm'
                                onClick={() => removeTask(i)}
                            >
                                Remove
                            </Button>{' '}
                            <Button
                                variant='outline-warning'
                                size='sm'
                                className='pl-2'
                                onClick={() => editTaskHandler(i, t)}
                            >
                                Edit
                            </Button>
                        </li>
                    ))}
            </ul>

            <SyntaxHighlighter
                language='tsx'
                style={oneDark}
            >{`
import { useState } from 'react';
import { IAction } from '../../src/core';
import { createReactStore } from '../../src/react';
import { Button } from 'react-bootstrap';

export const TodoComponent: React.FC = () => {
    const [task, setTask] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const tasks = todoStore.hooks.useTasks();
    const isBusy = todoStore.hooks.useIsBusy();
    const { addTask, editTask, removeTask } = todoStore.actions;

    const editTaskHandler = (index: number, task: string) => {
        setTask(task);
        setEditingIndex(index);
    };

    const addOrEditTask = () => {
        if (task.trim() === '') {
            return;
        }

        if (editingIndex !== null) {
            editTask(editingIndex, task);
            setEditingIndex(null);
        } else {
            addTask(task);
        }
        setTask('');
    };

    return (
        <div className='m-2'>
            <div className='col-3 form-inline'>
                <input
                    className='form-control mb-2 '
                    value={task}
                    placeholder='Enter a task'
                    onChange={(e) => setTask(e.target.value.trim())}
                />
                <Button
                    variant='outline-success'
                    size='sm'
                    onClick={() => addOrEditTask()}
                >
                    Save / Update
                </Button>
            </div>
            <ul className='m-3'>
                {tasks &&
                    tasks.map((t, i) => (
                        <li
                            key={i}
                            className='m-2'
                        >
                            {t}{' '}
                            <Button
                                variant='outline-danger'
                                size='sm'
                                onClick={() => removeTask(i)}
                            >
                                Remove
                            </Button>{' '}
                            <Button
                                variant='outline-warning'
                                size='sm'
                                className='pl-2'
                                onClick={() => editTaskHandler(i, t)}
                            >
                                Edit
                            </Button>
                        </li>
                    ))}
            </ul>
        </div>
    );
};

interface IToDoState {
    tasks: string[];
    isBusy: boolean;
}

interface IToDoActions extends IAction {
    addTask: (task: string) => void;
    removeTask: (index: number) => void;
    editTask: (index: number, newTask: string) => void;
    markBusy: () => void;
    markIdle: () => void;
}

interface IToDoSelectors extends IAction {
    isBusy: () => boolean;
}

export const todoStore = createReactStore<
    IToDoState,
    IToDoActions,
    IToDoSelectors
>({
    storeName: 'todo',
    initialState: {
        tasks: [],
        isBusy: false,
    },
    actions: {
        addTask: (state, task: string) => {
            state.tasks.push(task);
        },
        removeTask: (state, index: number) => {
            state.tasks.splice(index, 1);
        },
        editTask: (state, index: number, newTask: string) => {
            state.tasks[index] = newTask;
        },
        markBusy: (state) => {
            state.isBusy = true;
        },
        markIdle: (state) => {
            state.isBusy = false;
        },
    },
    selectors: {
        isBusy: (state) => state.isBusy,
    },
});
`}</SyntaxHighlighter>
        </div>
    );
};

interface IToDoState {
    tasks: string[];
    isBusy: boolean;
}

interface IToDoActions extends IAction {
    addTask: (task: string) => void;
    removeTask: (index: number) => void;
    editTask: (index: number, newTask: string) => void;
    markBusy: () => void;
    markIdle: () => void;
}

interface IToDoSelectors extends IAction {
    isBusy: () => boolean;
}

export const todoStore = createReactStore<
    IToDoState,
    IToDoActions,
    IToDoSelectors
>({
    storeName: 'todo',
    initialState: {
        tasks: [],
        isBusy: false,
    },
    actions: {
        addTask: (state, task: string) => {
            state.tasks.push(task);
        },
        removeTask: (state, index: number) => {
            state.tasks.splice(index, 1);
        },
        editTask: (state, index: number, newTask: string) => {
            state.tasks[index] = newTask;
        },
        markBusy: (state) => {
            state.isBusy = true;
        },
        markIdle: (state) => {
            state.isBusy = false;
        },
    },
    selectors: {
        isBusy: (state) => state.isBusy,
    },
});
