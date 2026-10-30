// Isolated so data/karachiRealData.js can import it without a cycle through
// memoryStore (which imports the dataset builder).
export const generateId = () => {
  return [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
};
