import { fetchAllResults } from '$lib/index.js';
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const load = async ({ params }) => {
  const results = await fetchAllResults();
  return {
    apiKey,
    results
  };
};
