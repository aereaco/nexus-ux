export function scope(node: any) {
    return mergeProxies(closestSignalStack(node))
}

export function addScopeToNode(node: any, signal: any, referenceNode: any) {
    node._data_signalStack = [signal, ...closestSignalStack(referenceNode || node)]

    return () => {
        node._data_signalStack = node._data_signalStack.filter((i: any) => i !== signal)
    }
}

export function hasScope(node: any) {
    return !! node._data_signalStack
}

export function closestSignalStack(node: any) {
    if (node._data_signalStack) return node._data_signalStack

    if (typeof ShadowRoot === 'function' && node instanceof ShadowRoot) {
        return closestSignalStack(node.host)
    }

    if (! node.parentNode) {
        return []
    }

    return closestSignalStack(node.parentNode)
}

export function closestSignalProxy(el: any) {
    return mergeProxies(closestSignalStack(el))
}

export function mergeProxies (objects: any[]) {
    return new Proxy({ objects }, mergeProxyTrap as any);
}

let mergeProxyTrap: any = {
    ownKeys({ objects }: any) {
        return Array.from(
            new Set(objects.flatMap((i: any) => Object.keys(i)))
        )
    },

    has({ objects }: any, name: any) {
        if (name == Symbol.unscopables) return false;

        return objects.some((obj: any) =>
            Object.prototype.hasOwnProperty.call(obj, name) ||
            Reflect.has(obj, name)
        );
    },

    get({ objects }: any, name: any, thisProxy: any) {
        if (name == "toJSON") return collapseProxies

        return Reflect.get(
            objects.find((obj: any) =>
                Reflect.has(obj, name)
            ) || {},
            name,
            thisProxy
        )
    },

    set({ objects }: any, name: any, value: any, thisProxy: any) {
        const target =
            objects.find((obj: any) =>
                Object.prototype.hasOwnProperty.call(obj, name)
            ) || objects[objects.length - 1];
        const descriptor = Object.getOwnPropertyDescriptor(target, name);
        if (descriptor?.set && descriptor?.get)
            return descriptor.set.call(thisProxy, value) || true;
        return Reflect.set(target, name, value);
    },
}

function collapseProxies(this: any) {
    let keys = Reflect.ownKeys(this)

    return keys.reduce((acc: any, key: any) => {
        acc[key] = Reflect.get(this, key)

        return acc;
    }, {})
}
