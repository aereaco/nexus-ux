import { RuntimeContext } from '../../engine/composition.ts';
import { heap } from '../../engine/reactivity.ts';

/**
 * GraphQL Client Sprite
 * Implements $gql for executing GraphQL queries and mutations
 * 
 * ZCZS: Uses typed arrays for numeric data in responses
 * 
 * Usage: $gql('query { users { id name } }') or $gql('mutation { createUser(...) }', variables)
 */

// Default GraphQL endpoint (can be configured)
let defaultEndpoint = '/graphql';

/**
 * Configure the GraphQL client
 */
export function configureGqlClient(config: {
  endpoint?: string;
}) {
  if (config.endpoint) defaultEndpoint = config.endpoint;
}

/**
 * Execute a GraphQL query or mutation
 */
async function executeGraphQL(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>,
  operationName?: string
): Promise<{ data: unknown; errors?: Array<{ message: string; locations?: unknown[]; path?: unknown[] }> }> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: variables || {},
      operationName
    })
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    return result;
  }

  return result;
}

/**
 * The $gql sprite
 * Usage: $gql('query { users { id name } }') or $gql('mutation { createUser(...) }', { name: 'John' })
 */
export function gqlSprite(runtime: RuntimeContext) {
  // Get endpoint from runtime config or use default
  const endpoint = (runtime as any).config?.gqlEndpoint || defaultEndpoint;

  return async (
    query: string, 
    variables?: Record<string, unknown>,
    options?: { endpoint?: string; operationName?: string }
  ) => {
    const actualEndpoint = options?.endpoint || endpoint;
    const operationName = options?.operationName;

    // Create reactive container for the result
    const result = runtime.reactive({
      data: null as unknown,
      errors: null as Array<{ message: string }> | null,
      loading: true,
      status: 'loading' as 'loading' | 'success' | 'error'
    });

    try {
      // ZCZS: Pre-allocate heap slots for numeric fields if beneficial
      // Extract field names from query for heap pre-allocation
      const numericFields: string[] = [];
      const fieldMatch = query.match(/\{[\s\S]*?\}\s*$/m);
      if (fieldMatch) {
        const queryBody = fieldMatch[0];
        // Match field names at top level (not nested)
        const topLevelFields = queryBody.match(/(?:query|mutation)\s*(?:\([^)]*\))?\s*\{([^{}]+)\{/);
        if (topLevelFields) {
          const fields = topLevelFields[1].split(',').map(f => f.trim().split(' ')[0]);
          fields.forEach(f => {
            // Heuristic: fields ending in Id, Count, Amount, etc. are likely numeric
            if (/_id|_count|_amount|_price|_qty|num|age|year$/i.test(f)) {
              numericFields.push(f);
              heap.allocateNumeric(f);
            }
          });
        }
      }

      const response = await executeGraphQL(actualEndpoint, query, variables, operationName);
      
      // ZCZS: Store numeric fields in heap
      if (response.data && typeof response.data === 'object' && numericFields.length > 0) {
        const dataObj = response.data as Record<string, unknown>;
        Object.entries(dataObj).forEach(([key, value]) => {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            // It's an object - check for numeric fields
            const nested = value as Record<string, unknown>;
            Object.entries(nested).forEach(([field, fieldValue]) => {
              if (typeof fieldValue === 'number' && numericFields.includes(field)) {
                heap.setNumeric(`${field}_0`, fieldValue);
              }
            });
          }
        });
      }

      result.data = response.data;
      result.errors = response.errors || null;
      result.status = response.errors ? 'error' : 'success';
    } catch (err) {
      result.errors = [{
        message: err instanceof Error ? err.message : String(err)
      }];
      result.status = 'error';
    } finally {
      result.loading = false;
    }

    return result;
  };
}

export default function(runtime: RuntimeContext) {
  return {
    $gql: gqlSprite(runtime)
  };
}
