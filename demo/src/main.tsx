import React from 'react';
import { createRoot } from 'react-dom/client';
import { produce } from 'immer';
import { useWithLogger, useWithValidation } from './../../src/middlewares';
import { useWithImmer } from './../../src/transformers';
import './../node_modules/bootstrap/scss/bootstrap.scss';
import { initDevToolsBridge } from './../../src/devtools';
import { Tabs, Tab, ThemeProvider } from 'react-bootstrap';
import { CounterComponent } from './Counter';
import { TodoComponent } from './ToDo';
initDevToolsBridge();

useWithImmer(produce);
useWithLogger();
useWithValidation();

const container = document.getElementById('root');

if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <ThemeProvider>
                <Tabs
                    defaultActiveKey='todo'
                    className='mb-3'
                >
                    <Tab
                        eventKey='counter'
                        title='Counter'
                    >
                        <CounterComponent />
                    </Tab>
                    <Tab
                        eventKey='todo'
                        title='Todo'
                    >
                        <TodoComponent />
                    </Tab>
                    <Tab
                        eventKey='readme'
                        title='Notes'
                    >
                        <ol>
                            <li>Persist logic is WIP</li>
                            <li>Immer is used for state management</li>
                            <li>React-Bootstrap is used for UI</li>
                            <li>DevTools is used for debugging</li>
                            <li>
                                Validation is used for state management. Counter
                                will not allow you to decrement below zero.
                            </li>
                            <li>
                                Dev tools to get record & play/pause/stop for
                                better debugging.
                            </li>
                        </ol>
                    </Tab>
                    <Tab
                        eventKey='bundle-stats'
                        title='Bundle Stats'
                    >
                        <iframe
                            src='/stats.html'
                            title='Bundle Stats'
                            style={{
                                width: '100%',
                                height: '100vh',
                                border: 'none',
                            }}
                        />
                    </Tab>
                </Tabs>
            </ThemeProvider>
        </React.StrictMode>
    );
}
