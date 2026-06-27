import Sortable from "/home/aerea/development/sortable/src/Sortable.js";
import MultiDrag from "/home/aerea/development/sortable/plugins/MultiDrag/MultiDrag.js";
import Swap from "/home/aerea/development/sortable/plugins/Swap/Swap.js";

Sortable.mount(new MultiDrag());
Sortable.mount(new Swap());

export { Sortable };
