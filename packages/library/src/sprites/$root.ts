import { closestRoot } from '../engine/lifecycle';
import { sprite } from '../engine/sprites';

sprite('root', (el: any) => closestRoot(el))

