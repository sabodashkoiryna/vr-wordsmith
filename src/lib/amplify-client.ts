import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import outputs from '../../amplify_outputs.json';

// amplify_outputs.json тут — заглушка, доки не запущено `npx ampx sandbox`
// (файл у .gitignore, реальний конфіг перезапише його після деплою).
// До того часу Auth/Data-запити падатимуть з мережевою помилкою — це очікувано.
Amplify.configure(outputs);

export const client = generateClient<Schema>();
