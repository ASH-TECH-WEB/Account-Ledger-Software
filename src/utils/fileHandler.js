// utils/fileHandler.js

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

export const saveJSONToFile = async (filename, data) => {
  const filePath = path.resolve('data', filename);
  await writeFile(filePath, JSON.stringify(data, null, 2));
};

export const readJSONFromFile = async (filename) => {
  const filePath = path.resolve('data', filename);
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
};
