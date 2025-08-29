import Alpine from "./alpine";

export function plugin(callback: any) {
    let callbacks = Array.isArray(callback) ? callback : [callback]

    callbacks.forEach((i: any) => i(Alpine))
}
