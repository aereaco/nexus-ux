let flushPending: boolean = false
let flushing: boolean = false
let queue: Function[] = []
let lastFlushedIndex: number = -1

export function scheduler (callback: Function) { queueJob(callback) }

function queueJob(job: Function) {
    if (! queue.includes(job)) queue.push(job)

    queueFlush()
}
export function dequeueJob(job: Function) {
    let index = queue.indexOf(job)

    if (index !== -1 && index > lastFlushedIndex) queue.splice(index, 1)
}

function queueFlush() {
    if (! flushing && ! flushPending) {
        flushPending = true

        queueMicrotask(flushJobs)
    }
}

export function flushJobs() {
    flushPending = false
    flushing = true

    for (let i = 0; i < queue.length; i++) {
        (queue[i] as Function)()
        lastFlushedIndex = i
    }

    queue.length = 0
    lastFlushedIndex = -1

    flushing = false
}
