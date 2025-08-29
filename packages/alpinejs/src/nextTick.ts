let tickStack: Function[] = []

let isHolding: boolean = false

export function nextTick(callback: Function = () => {}) {
  queueMicrotask(() => {
    isHolding || setTimeout(() => {
      releaseNextTicks()
    })
  })

  return new Promise((res) => {
    tickStack.push(() => {
        (callback as Function)();
        res(undefined);
    });
  })
}

export function releaseNextTicks() {
    isHolding = false

    while (tickStack.length) tickStack.shift()()
}

export function holdNextTicks() {
    isHolding = true
}
