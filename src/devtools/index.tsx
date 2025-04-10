import { allStores, setGlobalConfig } from '../core';
import {
    ApplySnapshotEvent,
    SaveActionEvent,
    IStoreAPI,
    Middleware,
} from '../core/types';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDiffViewerImport from 'react-diff-viewer';

// ToDo - Find out why webpack project was getting this ReactDiffViewer as object but not function.
function unwrapDefaultExport(mod: any): any {
    while (mod && typeof mod !== 'function' && 'default' in mod) {
        mod = mod.default;
    }
    return mod;
}
const DiffViewer = unwrapDefaultExport(ReactDiffViewerImport);

import { JSONTree } from 'react-json-tree';
import { tree } from 'd3-state-visualizer';
import ReactDOM from 'react-dom/client'; // or 'react-dom'

export function injectDevTools() {
    if (document.getElementById('re-ignite-widget')) return;

    const container = document.createElement('div');
    container.id = 're-ignite-widget';
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    root.render(<DevTools />);
}

export const DevTools = () => {
    const [stores, setStores] = useState<{
        [key: string]: any;
    }>({});
    const [isMaximized, setIsMaximized] = useState(false);
    const [storeEvents, setStoreEvents] = useState<{
        [key: string]: SaveActionEvent[];
    }>({});
    const [selectedStoreName, setSelectedStoreName] = useState<string>('');
    const [currentEvent, setCurrentEvent] = useState<SaveActionEvent | null>(
        null
    );
    const [activeTab, setActiveTab] = useState<
        'diff' | 'current_state' | 'tree'
    >('diff');

    const saveAction = useCallback((event: SaveActionEvent<any>) => {
        setStoreEvents((prev) => {
            const prevEvents = prev[event.storeName] || [];
            if (
                prevEvents[prevEvents.length - 1]?.timestamp === event.timestamp
            )
                return prev;
            return {
                ...prev,
                [event.storeName]: [...prevEvents, event],
            };
        });
    }, []);

    useEffect(() => {
        const onStoreCreated = (e: any) => {
            const devtools = window.__RE_IGNITE__;
            if (!devtools) return;
            setStores((prev) => ({
                ...prev,
                ...devtools.stores,
            }));
        };
        window.addEventListener('devtools:store_created', onStoreCreated);
        return () =>
            window.removeEventListener(
                'devtools:store_created',
                onStoreCreated
            );
    }, []);

    useEffect(() => {
        const devtools = window.__RE_IGNITE__;
        if (!devtools) return;
        setStores({ ...devtools.stores });
        setSaveActionCallback(saveAction);
    }, [saveAction]);

    useEffect(() => {
        if (!selectedStoreName && Object.keys(stores).length > 0) {
            setSelectedStoreName(Object.keys(stores)[0]);
        }
    }, [stores]);

    if (!isMaximized) {
        return (
            <button
                style={{
                    ...styles.button,
                    position: 'fixed',
                    float: 'right',
                    margin: '10px',
                    bottom: '0',
                    right: 0,
                }}
                onClick={() => setIsMaximized(true)}
            >
                Expand Dev Tools
            </button>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div
                    style={{
                        float: 'right',
                        position: 'relative',
                        marginRight: '20px',
                    }}
                >
                    <select
                        value={selectedStoreName}
                        onChange={(e) => {
                            setSelectedStoreName(e.target.value);
                            setCurrentEvent(null);
                        }}
                        style={styles.dropdown}
                    >
                        <option value=''>Select Store</option>
                        {Object.entries(stores).map((_item, key) => (
                            <option
                                key={_item[0]}
                                value={_item[0]}
                            >
                                {_item[0]}
                            </option>
                        ))}
                    </select>
                    <button
                        style={{
                            ...styles.button,
                        }}
                        onClick={() => setIsMaximized(false)}
                    >
                        Collapse Dev Tools
                    </button>
                </div>
            </div>

            <div style={styles.content}>
                <div style={styles.sidebar}>
                    <div style={styles.eventList}>
                        {(storeEvents[selectedStoreName] || []).map(
                            (item, index) => (
                                <div
                                    key={item.timestamp}
                                    style={styles.eventItem}
                                >
                                    <div style={styles.eventText}>
                                        <small>
                                            [
                                            {getCurrentTimeWithMilliseconds(
                                                item.timestamp
                                            )}
                                            ]
                                        </small>
                                        <small>
                                            {' '}
                                            [{item.timeTaken} ms] -&nbsp;
                                        </small>
                                        {`${item.storeName}/${item.actionName}`}
                                    </div>
                                    <div style={styles.buttonGroup}>
                                        <button
                                            style={styles.button}
                                            onClick={() => {
                                                window.__RE_IGNITE__?.applySnapshot(
                                                    {
                                                        actionName:
                                                            item.actionName,
                                                        storeName:
                                                            item.storeName,
                                                        snapshot: {
                                                            ...item.nextState,
                                                        },
                                                        timestamp:
                                                            new Date().getTime(),
                                                    }
                                                );
                                                console.log(
                                                    `Applied snapshot for ${item.storeName}/${item.actionName}`
                                                );
                                            }}
                                        >
                                            Set
                                        </button>
                                        <button
                                            style={styles.button}
                                            onClick={() =>
                                                setCurrentEvent(item)
                                            }
                                        >
                                            Diff
                                        </button>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                <div style={styles.main}>
                    {currentEvent && (
                        <div>
                            <div style={styles.tabs}>
                                <button
                                    style={
                                        activeTab === 'diff'
                                            ? styles.activeTab
                                            : styles.tab
                                    }
                                    onClick={() => setActiveTab('diff')}
                                >
                                    Selected Action Diff
                                </button>
                                <button
                                    style={
                                        activeTab === 'current_state'
                                            ? styles.activeTab
                                            : styles.tab
                                    }
                                    onClick={() =>
                                        setActiveTab('current_state')
                                    }
                                >
                                    Chart (Current State)
                                </button>
                                <button
                                    style={
                                        activeTab === 'tree'
                                            ? styles.activeTab
                                            : styles.tab
                                    }
                                    onClick={() => setActiveTab('tree')}
                                >
                                    Tree (Current State)
                                </button>
                            </div>

                            <div
                                style={{ marginTop: 10, position: 'relative' }}
                            >
                                {activeTab === 'diff' && (
                                    <DiffViewer
                                        oldValue={JSON.stringify(
                                            currentEvent.prevState,
                                            null,
                                            2
                                        )}
                                        newValue={JSON.stringify(
                                            currentEvent.nextState,
                                            null,
                                            2
                                        )}
                                        splitView={true}
                                        useDarkTheme={true}
                                        leftTitle='Previous State'
                                        rightTitle='Next State'
                                    />
                                )}

                                {activeTab === 'current_state' && (
                                    <JSONTree
                                        data={currentEvent.nextState}
                                        invertTheme={false}
                                    />
                                )}

                                {activeTab === 'tree' && (
                                    <D3TreeVisualizer
                                        state={currentEvent.nextState}
                                        id='nextTree'
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helpers & Components

function getCurrentTimeWithMilliseconds(date: number): string {
    const now = new Date(date);
    const pad = (n: number, z = 2) => ('00' + n).slice(-z);
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
        now.getSeconds()
    )}.${pad(now.getMilliseconds(), 3)}`;
}

type Props = {
    state: any;
    id?: string;
};

const D3TreeVisualizer: React.FC<Props> = ({ state, id = 'treeExample' }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && state) {
            containerRef.current.innerHTML = '';
            const render = tree(containerRef.current, {
                id,
                isSorted: true,
                widthBetweenNodesCoeff: 1.5,
                heightBetweenNodesCoeff: 2,
                nodeStyleOptions: {
                    colors: {
                        default: '#a1b56c',
                        collapsed: '#a1b56c',
                        parent: '#ba8baf',
                    },
                    radius: 7,
                },
                textStyleOptions: {
                    colors: {
                        default: '#7cafc2',
                        hover: '#e8e8e8',
                    },
                },
                tooltipOptions: {
                    indentationSize: 2,
                    offset: {
                        left: 30,
                        top: 0,
                    },
                    styles: {
                        color: '#e8e8e8',
                        backgroundColor: '#181818',
                        opacity: '0.9',
                        borderRadius: '5px',
                        padding: '5px',
                    },
                },
            });
            render(state);
        }
    }, [state, id]);

    return <div ref={containerRef} />;
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        height: '30%',
        width: '100%',
        position: 'fixed',
        bottom: 0,
        overflowY: 'auto',
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '14px',
    },
    header: {
        display: 'block',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
    },
    title: {
        margin: 0,
        fontSize: '16px',
    },
    dropdown: {
        backgroundColor: '#1e1e1e',
        color: '#fff',
        border: '1px solid #333',
        padding: '4px 8px',
        borderRadius: '4px',
        margin: '0 30px',
    },
    content: {
        display: 'flex',
        gap: '10px',
    },
    sidebar: {
        flex: '0 0 25%',
        maxHeight: '300px',
        overflowY: 'auto',
    },
    eventList: {
        border: '0',
    },
    eventItem: {
        backgroundColor: '#2a2a2a',
        border: '1px solid #444',
        borderRadius: '2px',
        padding: '4px',
        marginBottom: '6px',
    },
    eventText: {
        marginBottom: '4px',
    },
    buttonGroup: {
        display: 'flex',
        gap: '6px',
    },
    main: {
        flex: 1,
    },
    tabs: {
        display: 'flex',
        gap: '10px',
        marginBottom: '10px',
    },
    tab: {
        backgroundColor: '#333',
        color: '#ccc',
        border: '1px solid #555',
        padding: '6px 10px',
        cursor: 'pointer',
        borderRadius: '4px',
    },
    activeTab: {
        backgroundColor: '#555',
        color: '#fff',
        border: '1px solid #888',
        padding: '6px 10px',
        cursor: 'pointer',
        borderRadius: '4px',
    },
    button: {
        backgroundColor: '#333',
        color: '#ccc',
        border: '1px solid #555',
        padding: '4px 8px',
        cursor: 'pointer',
        borderRadius: '4px',
    },
};

export function setSaveActionCallback(
    saveAction: (event: SaveActionEvent) => void
) {
    if (window.__RE_IGNITE__) {
        window.__RE_IGNITE__.saveAction = saveAction;
    } else {
        console.warn(
            '[Store] DevTools bridge is not initialized. Please enable DevTools in the config.'
        );
    }
}

export function initDevToolsBridge() {
    window.addEventListener('inject-dev-tools', () => {
        injectDevTools();
    });
    window.__RE_IGNITE__ = {
        stores: allStores,
        onStoreCreated: (
            storeName: string,
            store: IStoreAPI<any, any, any>
        ) => {
            window.dispatchEvent(
                new CustomEvent('devtools:store_created', {
                    storeName,
                    store,
                } as any)
            );
        },
        applySnapshot: (event: ApplySnapshotEvent<any>) => {
            const store = allStores[event.storeName];
            if (store) {
                store.setState(
                    event.snapshot,
                    `devtools/applySnapshot/${event.actionName}`,
                    {
                        beforeMiddlewares: [], // as this comes from devtools, we don't want to run any middlewares
                        afterMiddlewares: [],
                    }
                );
            }
        },
        saveAction: (event: SaveActionEvent<any>) => {
            console.error(
                'saveAction must be set using setSaveActionCallback or directly in the dev tools component.'
            );
        },
    };

    window.dispatchEvent(new Event('inject-dev-tools'));
    setGlobalConfig({
        devTools: true,
        afterMiddlewares: [devToolsMiddleware],
    });
    console.log('[Store] DevTools bridge initialized.');
}

const devToolsMiddleware: Middleware<any> = {
    name: 'devTools',
    type: 'after',
    fn: (
        storeName: string,
        actionName: string,
        _prevState,
        _nextState,
        config,
        others,
        ...args: any[]
    ) => {
        window?.__RE_IGNITE__?.saveAction?.({
            storeName,
            actionName,
            prevState: _prevState,
            nextState: _nextState,
            args: args,
            timestamp: Date.now(),
            timeTaken: others?.timeTaken,
        });
    },
};
