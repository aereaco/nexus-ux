import { dispatch } from '../utils/dispatch'
import { magic } from '../magics'

// Register $dispatch magic
magic('dispatch', (el: any) => dispatch.bind(dispatch, el))
