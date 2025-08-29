import { scope } from '../scope'
import { magic } from '../magics'

magic('signal', (el: any) => scope(el))
