import { scope } from '../scope'
import { magic } from '../magics'

magic('data', (el: any) => scope(el))
