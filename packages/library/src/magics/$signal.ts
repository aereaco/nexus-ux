import { scope } from '../engine/scope'
import { magic } from '../engine/magics'

magic('signal', (el: any) => scope(el))
