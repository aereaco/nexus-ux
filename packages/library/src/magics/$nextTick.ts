import { nextTick } from '../engine/nextTick'
import { magic } from '../engine/magics'

magic('nextTick', () => nextTick)

