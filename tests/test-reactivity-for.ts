import { reactive, effect, stop } from "./src/engine/reactivity.ts";

const state = reactive({
    list1: [{ id: 1 }, { id: 2 }]
});

let runCount = 0;
const runner = effect(() => {
    runCount++;
    const items = state.list1;
    let count = 0;
    items.forEach(item => {
        count++;
    });
    console.log(`Effect ran. Count: ${count}`);
});

console.log("Initial runCount:", runCount);
console.log("Splicing list1...");
state.list1.splice(1, 1);
console.log("RunCount after splice:", runCount);
