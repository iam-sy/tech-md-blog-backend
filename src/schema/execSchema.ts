import { makeExecutableSchema } from '@graphql-tools/schema';
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
import { loadFiles, loadFilesSync } from '@graphql-tools/load-files';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const typeDefs = loadFilesSync(path.join(__dirname, './**/*.graphql'), {
  recursive: true,
  extensions: ['graphql'],
});

async function getResolvers() {
  const resolversPath = path.join(__dirname, './**/*.resolvers.*');
  const resolversArray = await loadFiles(resolversPath, {
    useRequire: true,
    requireMethod: async (path) => {
      return await import(path);
    },
  });
  return mergeResolvers(resolversArray);
}
const resolvers = await getResolvers();

const schema = makeExecutableSchema({
  typeDefs: mergeTypeDefs(typeDefs),
  resolvers: {
    Query: resolvers.Query,
    Mutation: resolvers.Mutation,
  },
});

export const execSchema = schema;
