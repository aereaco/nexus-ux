import State from '../src/index'

(window as any).State = State

queueMicrotask(() => {
    State.start()
})
