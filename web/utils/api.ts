
let API_BASE = "https://orbit-api-938180057345.us-central1.run.app";

export const setApiBase = (url: string) => {
  API_BASE = url;
};

export const getApiBase = () => API_BASE;

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export { API_BASE };
