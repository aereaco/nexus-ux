import { closestRoot } from '../engine/lifecycle';
import { magic } from '../engine/magics';

magic('root', (el: any) => closestRoot(el))

