type GraphQLResult<T> = { data: T; errors?: { message: string }[] | null };

// Amplify Data client-методи повертають { data, errors } замість кидання винятку —
// цей хелпер перетворює помилку GraphQL на звичайний throw, щоб адмінка могла
// показувати її як звичайну помилку форми.
export async function unwrap<T>(promise: Promise<GraphQLResult<T>>): Promise<T> {
  const { data, errors } = await promise;
  if (errors && errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join('; '));
  }
  return data;
}
