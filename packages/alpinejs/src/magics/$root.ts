import { closestRoot } from "../lifecycle";
import { magic } from "../magics";

magic('root', (el: any) => closestRoot(el))

